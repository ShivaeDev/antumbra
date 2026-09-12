import { createHash } from "node:crypto";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { Machine } from "@antumbra/runner-git/resources/machine.ts";
import { RunnerFailure } from "@antumbra/runner-git/resources/model.ts";
import { Effect, Layer } from "effect";

const pathExists = (path: string): Effect.Effect<boolean> => Effect.sync(() => existsSync(path));

const ensureDirectory = (path: string): Effect.Effect<void, RunnerFailure> =>
	Effect.try({
		catch: (cause) =>
			new RunnerFailure({
				detail: `mkdir ${path}: ${String(cause)}`,
				tag: "local",
			}),
		try: () => {
			mkdirSync(path, { recursive: true });
		},
	});

const canonicalPath = (path: string): Effect.Effect<string, RunnerFailure> =>
	Effect.try({
		catch: (cause) =>
			new RunnerFailure({
				detail: `realpath ${path}: ${String(cause)}`,
				tag: "local",
			}),
		try: () => realpathSync(path),
	});

export const machine = Machine.of({
	join,
	pathExists,
	ensureDirectory,
	canonicalPath,
	mirrorName: (slug, source) => `${slug}-${createHash("sha256").update(source).digest("hex").slice(0, 8)}.git`,
});
export const machineLayer = Layer.succeed(Machine, machine);
