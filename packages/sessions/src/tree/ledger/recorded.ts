import { Database } from "@antumbra/persistence";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect } from "effect";

const rawOf = (row: { readonly kind: string; readonly payload: string }): ReadonlyArray<string> => {
	const projected = projectHistoricalAgentEvent(row.kind, row.payload);
	return projected._tag === "Known" ? [projected.event.raw.payload] : [];
};

export const recorded = Effect.fn("SessionTreeLedger.recorded")(function* (sessionId: string) {
	const db = yield* Database;
	return yield* db.SessionEvent.where({ sessionId })
		.all()
		.pipe(Effect.map((rows) => rows.flatMap(rawOf)));
});
