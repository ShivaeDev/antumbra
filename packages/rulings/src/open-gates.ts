import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingGate } from "#model.ts";

// why: readiness asks which pieces an unanswered ruling still holds, so the
// unruled set is what a gate row is read against — a gate whose ruling landed
// is history rather than a hold.
export const openGates = Effect.fn("rulings.openGates")(function* () {
	const db = yield* Database;
	const unruled = new Set(
		(yield* db.Ruling.where({ ruledAt: null }).select("id").all()).map(
			(row) => row.id,
		),
	);
	const rows = yield* db.RulingGate.all();
	return rows
		.filter((row) => unruled.has(row.rulingId))
		.map(
			(row): RulingGate => ({ pieceId: row.pieceId, rulingId: row.rulingId }),
		);
});
