import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { request as requestOperation } from "@antumbra/domain-sessions/commands/request.ts";
import { cancel } from "@antumbra/domain-starts/commands/cancel.ts";
import { request } from "@antumbra/domain-starts/commands/request.ts";
import { dispatch } from "@antumbra/domain-starts/queries/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Clock, Effect } from "effect";
import { charter } from "#starts/charter.ts";
import { binding, identity } from "#starts/request.ts";

export const dispatching = Effect.gen(function* () {
	const commit = yield* Commit;
	const live = yield* Live;
	return yield* run(
		dispatch,
		{},
		Effect.fn("Starts.dispatch")(function* (reading) {
			for (const birth of reading.cancel)
				yield* commit
					.commit(cancel, { id: birth.id, requestId: Request.make(`cancel:${birth.id}`) })
					.pipe(Effect.catch((failure) => Effect.logDebug("Start cancellation no longer applies", failure)));
			for (const target of reading.ready) {
				const requestId = Request.make(crypto.randomUUID());
				if (target.root !== null) {
					yield* commit
						.commit(requestOperation, {
							requestId,
							sessionId: target.root.id,
							kind: "wake",
							inputId: null,
							requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
							reason: `Resume assigned piece ${target.piece.id}`,
						})
						.pipe(Effect.catch((failure) => Effect.logDebug("Assigned piece wake no longer applies", failure)));
				} else {
					const ids = identity(requestId);
					const settings = yield* live.read(resolve, { voyageId: target.voyage.id, role: "crew" });
					const tools = yield* binding({ ...ids, voyageId: target.voyage.id, pieceId: target.piece.id, role: target.piece.role });
					yield* commit
						.commit(request, {
							requestId,
							...ids,
							...settings,
							...tools,
							voyageId: target.voyage.id,
							pieceId: target.piece.id,
							source: "dispatch",
							role: target.piece.role,
							charter: yield* charter(ids.agentId, target.voyage, target.piece),
						})
						.pipe(Effect.catch((failure) => Effect.logDebug("Piece birth no longer applies", failure)));
				}
			}
		}),
	);
});
