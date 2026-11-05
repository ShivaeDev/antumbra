import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Supervision } from "@antumbra/server-supervision/service.ts";
import { Effect } from "effect";
import type { Loops } from "#supervision/handle.ts";

export const forgetRunning = Effect.fn("Supervision.forgetRunning")(function* (loops: Loops) {
	const supervisionService = yield* Supervision;

	const held = yield* supervisionService.stoppedLoops({}).pipe(Effect.orDie);
	for (const entry of held) {
		if (!loops.running(entry.loop)) continue;
		yield* supervisionService
			.forgetLoop({ loop: entry.loop, requestId: Request.make(`loop-forgotten:${entry.loop}:${entry.at}`) })
			.pipe(Effect.catchCause((cause) => Effect.logError(`the ${entry.loop} loop record was not cleared`, cause)));
	}
});
