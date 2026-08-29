import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { type AntumbraPlugin, makePluginHost } from "@antumbra/plugin-api";
import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Logger } from "effect";
import { activateInstalledCli } from "#adapters/installed-cli.ts";

const FENCE = "\u001f";

const executable = (file: string, body: string): string => {
	writeFileSync(file, `#!/bin/sh\n${body}\n`);
	chmodSync(file, 0o755);
	return file;
};

const workspace = () => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-installed-cli-"));
	const directory = (name: string): string => {
		const made = join(root, name);
		mkdirSync(made);
		return made;
	};
	// why: the probe asks the login shell for its PATH; a shell that answers
	// with fenced directories of our own keeps the test off whatever the
	// machine running it happens to have installed.
	const loginShellOn = (...directories: readonly string[]): string =>
		executable(
			join(root, "login-shell"),
			`printf '${FENCE}%s${FENCE}' '${directories.join(delimiter)}'`,
		);
	return { directory, loginShellOn };
};

interface Probe {
	readonly chosen: readonly string[];
	readonly warnings: readonly string[];
}

const probeCodex = (loginShell: string): Effect.Effect<Probe> => {
	const chosen: string[] = [];
	const warnings: string[] = [];
	const recording = (command: string): AntumbraPlugin => ({
		activate: () =>
			Effect.sync(() => {
				chosen.push(command);
			}),
		name: "codex",
	});
	return Effect.gen(function* () {
		const host = yield* makePluginHost;
		yield* activateInstalledCli(host.context, "codex", /codex/i, recording);
		return { chosen, warnings } satisfies Probe;
	}).pipe(
		Effect.scoped,
		Effect.provide(
			Logger.layer([
				Logger.make<unknown, void>(({ logLevel, message }) => {
					if (logLevel === "Warn") {
						warnings.push(String(message));
					}
				}),
			]),
		),
		Effect.provide(
			ConfigProvider.layer(ConfigProvider.fromUnknown({ SHELL: loginShell })),
		),
	);
};

describe("a backend is activated only for a CLI that names itself", () => {
	it.effect("walks past a shim that answers as another tool", () =>
		Effect.gen(function* () {
			const { directory, loginShellOn } = workspace();
			const first = directory("first");
			const second = directory("second");
			const shim = executable(join(first, "codex"), "echo 'vp 0.2.8'");
			const real = executable(join(second, "codex"), "echo 'codex-cli 0.50.0'");
			const probe = yield* probeCodex(loginShellOn(first, second));
			expect(probe.chosen).toEqual([real]);
			expect(probe.warnings.join("\n")).toContain(shim);
		}),
	);

	it.effect("walks past a candidate that cannot answer --version", () =>
		Effect.gen(function* () {
			const { directory, loginShellOn } = workspace();
			const first = directory("first");
			const second = directory("second");
			executable(join(first, "codex"), "exit 1");
			const real = executable(join(second, "codex"), "echo 'codex-cli 0.50.0'");
			const probe = yield* probeCodex(loginShellOn(first, second));
			expect(probe.chosen).toEqual([real]);
		}),
	);

	it.effect("spawns a symlinked CLI by the path it was found under", () =>
		Effect.gen(function* () {
			const { directory, loginShellOn } = workspace();
			const bin = directory("bin");
			const libexec = directory("libexec");
			const multicall = executable(
				join(libexec, "vp"),
				'echo "$(basename "$0") 0.150.1"',
			);
			const link = join(bin, "codex");
			symlinkSync(multicall, link);
			const probe = yield* probeCodex(loginShellOn(bin));
			expect(probe.chosen).toEqual([link]);
			expect(probe.warnings).toEqual([]);
		}),
	);

	it.effect("registers nothing when no candidate claims the name", () =>
		Effect.gen(function* () {
			const { directory, loginShellOn } = workspace();
			const only = directory("only");
			const shim = executable(join(only, "codex"), "echo 'vp 0.2.8'");
			const probe = yield* probeCodex(loginShellOn(only));
			expect(probe.chosen).toEqual([]);
			expect(probe.warnings.join("\n")).toContain(shim);
			expect(probe.warnings.join("\n")).toContain("not registered");
		}),
	);
});
