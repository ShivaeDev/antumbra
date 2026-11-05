import { dispatch } from "@antumbra/domain-agents/queries/dispatch.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Clock, Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";

export const dispatching = Effect.fn("Agents.dispatching")(function* () {
	const agentsService = yield* Agents;

	return yield* run({
		keys: watchKeys(dispatch.reads, undefined),
		read: agentsService.dispatch({}).pipe(Effect.orDie),
		act: Effect.fn("Agents.dispatching")(function* (reading) {
			const agentsService = yield* Agents;
			const sessionsService = yield* Sessions;

			for (const held of reading.cancel) {
				yield* agentsService
					.cancel({ id: held.id, requestId: Id.Request.make(`cancel:${held.id}`) })
					.pipe(Effect.catch((failure) => Effect.logDebug("a birth cancellation no longer applies", failure)));
			}
			for (const target of reading.ready) {
				if (target.held) continue;
				const requestId = Id.Request.make(Id.make());
				if (target.root !== null) {
					yield* sessionsService
						.request({
							requestId,
							sessionId: target.root.id,
							kind: "wake",
							inputId: null,
							requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
							reason: `Resume assigned piece ${target.piece.id}`,
						})
						.pipe(Effect.catch((failure) => Effect.logDebug("an assigned piece wake no longer applies", failure)));
					continue;
				}
				yield* agentsService
					.request({ requestId, voyageId: target.voyage.id, pieceId: target.piece.id, role: target.piece.role })
					.pipe(Effect.catch((failure) => Effect.logDebug("a piece birth no longer applies", failure)));
			}
		}),
	});
});
