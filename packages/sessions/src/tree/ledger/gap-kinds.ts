import { Database } from "@antumbra/persistence";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";

const GAP = "subsession.gap";

const gapKindOf = (row: { readonly kind: string; readonly payload: string }): ReadonlyArray<string> => {
	const projected = projectHistoricalAgentEvent(row.kind, row.payload);
	return projected._tag === "Known" && projected.event.type === GAP ? [projected.event.gapKind] : [];
};

export const gapKinds = Effect.fn("SessionTreeLedger.gapKinds")(function* (sessionId: string) {
	const db = yield* Database;
	return yield* db.SessionEvent.where({ kind: GAP, sessionId })
		.all()
		.pipe(Effect.map((rows) => rows.flatMap(gapKindOf)));
});
