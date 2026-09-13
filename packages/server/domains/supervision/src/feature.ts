import { feature } from "@antumbra/platform-feature/feature.ts";
import { failLoop, loopFailed, loopFailedMaterializer } from "#commands/loop-failed.ts";
import { forgetLoop, loopForgotten, loopForgottenMaterializer } from "#commands/loop-forgotten.ts";
import { loopResumed, loopResumedMaterializer, resumeLoop } from "#commands/loop-resumed.ts";
import { stoppedLoops } from "#queries/stopped-loops.ts";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const supervision = feature("supervision", {
	rows: [stoppedLoop],
	facts: [loopFailed, loopForgotten, loopResumed],
	commands: [failLoop, forgetLoop, resumeLoop],
	materializers: [loopFailedMaterializer, loopForgottenMaterializer, loopResumedMaterializer],
	queries: [stoppedLoops],
});
