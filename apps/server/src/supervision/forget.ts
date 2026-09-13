import { forgetLoop } from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { stoppedLoops } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import type { Loops } from "#supervision/handle.ts";

export const forgetRunning = Effect.fn("Supervision.forgetRunning")(function* (loops: Loops) {
	const commit = yield* Commit;
	const live = yield* Live;
	const held = yield* live.read(stoppedLoops, {});
	for (const entry of held) {
		if (!loops.running(entry.loop)) continue;
		yield* commit
			.commit(forgetLoop, { loop: entry.loop, requestId: Request.make(`loop-forgotten:${entry.loop}:${entry.at}`) })
			.pipe(Effect.catchCause((cause) => Effect.logError(`the ${entry.loop} loop record was not cleared`, cause)));
	}
});
