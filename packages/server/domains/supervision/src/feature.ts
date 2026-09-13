import { feature } from "@antumbra/platform-feature/feature.ts";
import { failLoop, loopFailed, loopFailedMaterializer } from "#commands/loop-failed.ts";
import { loopResumed, loopResumedMaterializer, resumeLoop } from "#commands/loop-resumed.ts";
import { stoppedLoops } from "#queries/stopped-loops.ts";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const supervision = feature("supervision", {
	rows: [stoppedLoop],
	facts: [loopFailed, loopResumed],
	commands: [failLoop, resumeLoop],
	materializers: [loopFailedMaterializer, loopResumedMaterializer],
	queries: [stoppedLoops],
});
