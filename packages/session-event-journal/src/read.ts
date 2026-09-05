import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const read = Effect.fn("SessionEventJournal.read")(function* (sessionId: string, fromSeq: number) {
	const db = yield* Database;
	return yield* db.SessionEvent.where({ sessionId })
		.where((event) => event.seq.gte(fromSeq))
		.orderBy((event) => event.seq.asc())
		.all();
});
