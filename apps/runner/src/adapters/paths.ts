import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";

export const runnerPaths = (directory: string) =>
	Effect.promise(() => mkdir(directory, { recursive: true })).pipe(
		Effect.as({
			filename: join(directory, "runner.sqlite"),
			inputs: join(directory, "session-inputs"),
			moorageRoot: join(directory, "moorage"),
			reposRoot: join(directory, "repos"),
		}),
	);
