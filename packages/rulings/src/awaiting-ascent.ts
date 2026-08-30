import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { loadRuling } from "#read.ts";

// why: a request is owed to the one rung it waits on, and the record is the
// whole of what is owed — open, never ruled, and asked by an agent rather than
// written by an authority for itself. A question waiting on the admiral is owed
// to no agent: the window is where the admiral meets it, so it is left out
// rather than carried to somebody who cannot answer it.
export const awaitingAscent = Effect.fn("rulings.awaitingAscent")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ ruledAt: null })
		.where((ruling) => ruling.requesterAgentId.isNotNull())
		.orderBy((ruling) => ruling.createdAt.asc())
		.all();
	const asked = yield* Effect.forEach(rows, loadRuling);
	return asked.filter((ruling) => Option.exists(ruling.rung, (rung) => rung !== "admiral"));
});
