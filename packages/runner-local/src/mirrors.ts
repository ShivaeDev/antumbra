import { join } from "node:path";
import { cloneMirror, refreshMirror } from "@antumbra/git";
import type { RunnerError } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { pathExists } from "#adapters/fs.ts";
import { runGit } from "#git-runtime.ts";
import { mirrorName } from "#naming.ts";

export const ensureMirror = (
	reposRoot: string,
	source: string,
): Effect.Effect<string, RunnerError> =>
	Effect.gen(function* () {
		const mirror = join(reposRoot, mirrorName(source));
		const exists = yield* pathExists(mirror);
		if (!exists) {
			yield* runGit(cloneMirror(source, mirror));
		}
		yield* runGit(refreshMirror(mirror));
		return mirror;
	});
