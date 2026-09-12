import { Effect } from "effect";
import { cloneMirror, refreshMirror } from "#mirrors.ts";
import type { GitProcess } from "#process.ts";
import { runGit } from "#resources/git-runtime.ts";
import type { Machine, MachineShape } from "#resources/machine.ts";
import { pathExists } from "#resources/machine.ts";
import type { BerthPlan, RunnerError } from "#resources/model.ts";

export const ensureMirror = (machine: MachineShape, reposRoot: string, berth: BerthPlan): Effect.Effect<string, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		const mirror = machine.join(reposRoot, machine.mirrorName(berth.slug, berth.source));
		const exists = yield* pathExists(mirror);
		if (!exists) {
			yield* runGit(cloneMirror(berth.source, mirror));
		}
		yield* runGit(refreshMirror(mirror));
		return mirror;
	});
