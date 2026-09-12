import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";
import { githubHosts } from "#adapters/github/hosts.ts";

const fixture = Effect.acquireRelease(
	Effect.sync(() => {
		const root = mkdtempSync(join(tmpdir(), "antumbra-gh-login-"));
		const bin = join(root, "homebrew-bin");
		mkdirSync(bin);
		const executable = join(root, "gh-launcher");
		writeFileSync(executable, "#!/bin/sh\nprintf 'Logged in through login PATH\\n'\n");
		chmodSync(executable, 0o755);
		symlinkSync(executable, join(bin, "gh"));
		const shell = join(root, "login-shell");
		writeFileSync(shell, `#!/bin/sh\nprintf 'shell startup output\\n'\nPATH='${bin}'\nexport PATH\nexec /bin/sh -c "$2"\n`);
		chmodSync(shell, 0o755);
		return { root, shell };
	}),
	({ root }) => Effect.sync(() => rmSync(root, { recursive: true, force: true })),
);

it.live("uses gh installed on the login PATH despite shell startup output", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { shell } = yield* fixture;
			const capability = Effect.gen(function* () {
				const [host] = yield* ChangeHosts;
				if (host === undefined) return yield* Effect.die("GitHub host was not installed");
				return yield* host.capability;
			});
			const result = yield* capability.pipe(
				Effect.provide(githubHosts.pipe(Layer.provide(NodeServices.layer))),
				Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnvRecord({ SHELL: shell })),
			);
			expect(result).toEqual({ available: true, detail: "Logged in through login PATH" });
		}),
	),
);
