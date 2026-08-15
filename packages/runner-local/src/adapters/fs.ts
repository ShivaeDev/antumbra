import { existsSync, mkdirSync } from "node:fs";
import { RunnerFailure } from "@antumbra/plugin-api";
import { Effect } from "effect";

export const pathExists = (path: string): Effect.Effect<boolean> =>
	Effect.sync(() => existsSync(path));

export const ensureDirectory = (
	path: string,
): Effect.Effect<void, RunnerFailure> =>
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
