import { join } from "node:path";
import { cloneMirror, refreshMirror } from "@antumbra/git";
import type { BerthPlan, RunnerError } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { pathExists } from "#adapters/fs.ts";
import { runGit } from "#git-runtime.ts";
import { mirrorName } from "#naming.ts";

export const ensureMirror = (reposRoot: string, berth: BerthPlan): Effect.Effect<string, RunnerError> =>
	Effect.gen(function* () {
		const mirror = join(reposRoot, mirrorName(berth.slug, berth.source));
		const exists = yield* pathExists(mirror);
		if (!exists) {
			yield* runGit(cloneMirror(berth.source, mirror));
		}
		yield* runGit(refreshMirror(mirror));
		return mirror;
	});
