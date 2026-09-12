import { request as requestOperation } from "@antumbra/domain-sessions/commands/request.ts";
import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { cancel } from "#commands/cancel.ts";
import { request } from "#commands/request.ts";
import { dispatch } from "#queries/dispatch.ts";

export const dispatching = reconciler("dispatching", {
	watch: dispatch,
	ports: [],
	run: Effect.fn("Agents.dispatching")(function* (reading, reconciling) {
		for (const held of reading.cancel) {
			yield* reconciling
				.commit(cancel, { id: held.id, requestId: Request.make(`cancel:${held.id}`) })
				.pipe(Effect.catch((failure) => Effect.logDebug("a birth cancellation no longer applies", failure)));
		}
		for (const target of reading.ready) {
			const requestId = Request.make(crypto.randomUUID());
			if (target.root !== null) {
				yield* reconciling
					.commit(requestOperation, {
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
			yield* reconciling
				.commit(request, { requestId, voyageId: target.voyage.id, pieceId: target.piece.id, role: target.piece.role })
				.pipe(Effect.catch((failure) => Effect.logDebug("a piece birth no longer applies", failure)));
		}
	}),
});
