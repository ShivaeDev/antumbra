import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { loadRuling } from "#read.ts";

// why: a request whose answer would bind the fleet is owed to the authority
// that answers at that radius, and the record is the whole of what is owed —
// open, never ruled, and asked by an agent rather than written by an authority
// for itself. The radius is the effective one, so a question a captain pushed
// up to fleet radius climbs with it and one pushed back down stops climbing.
export const awaitingAscent = Effect.fn("rulings.awaitingAscent")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.createdAt.asc())
		.all();
	const asked = yield* Effect.forEach(rows, loadRuling);
	return asked.filter((ruling) => ruling.radius === "fleet");
});
