import { join } from "node:path";
import type { RunnerFailure } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { pathExists } from "#adapters/fs.ts";
import { git } from "#adapters/git.ts";
import { mirrorName } from "#naming.ts";

// why: bare mirrors default to fetching no branch refs — the refspec makes
// origin/* resolvable so worktrees can start from any ref.
export const ensureMirror = (
	reposRoot: string,
	source: string,
): Effect.Effect<string, RunnerFailure> =>
	Effect.gen(function* () {
		const mirror = join(reposRoot, mirrorName(source));
		const exists = yield* pathExists(mirror);
		if (!exists) {
			yield* git(["clone", "--bare", source, mirror]);
			yield* git([
				"-C",
				mirror,
				"config",
				"remote.origin.fetch",
				"+refs/heads/*:refs/remotes/origin/*",
			]);
		}
		yield* git(["-C", mirror, "fetch", "--quiet", "origin"]);
		return mirror;
	});
