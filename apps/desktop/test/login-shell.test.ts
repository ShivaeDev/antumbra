import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option } from "effect";
import { findOnLoginPath } from "#adapters/login-shell.ts";

const root = mkdtempSync(join(tmpdir(), "antumbra-login-path-"));
const bin = join(root, "bin");
mkdirSync(bin);

const script = (file: string, body: string) => {
	writeFileSync(file, body);
	chmodSync(file, 0o755);
	return file;
};

const launcher = script(join(root, "launcher"), "#!/bin/sh\nexit 0\n");
const linked = join(bin, "codex");
symlinkSync(launcher, linked);

// why: the probe runs the user's shell as an interactive login shell; this
// stand-in answers with a PATH the test owns and runs the probe command as any
// shell would.
const shell = script(
	join(root, "fake-login-shell"),
	`#!/bin/sh\nPATH="${bin}"\nexport PATH\nexec /bin/sh -c "$2"\n`,
);

const onFakeLoginShell = <A>(effect: Effect.Effect<A>) =>
	Effect.provideService(
		effect,
		ConfigProvider.ConfigProvider,
		ConfigProvider.fromEnvRecord({ SHELL: shell }),
	);

it.effect("hands back the symlink the login PATH holds, not its target", () =>
	Effect.gen(function* () {
		const found = yield* onFakeLoginShell(findOnLoginPath("codex"));
		expect(found).toEqual(Option.some(linked));
	}),
);

it.effect("is none when the login PATH holds no such executable", () =>
	Effect.gen(function* () {
		const found = yield* onFakeLoginShell(findOnLoginPath("nowhere"));
		expect(found).toEqual(Option.none());
	}),
);
