import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingGate } from "#model.ts";

export const openGates = Effect.fn("rulings.openGates")(function* () {
	const db = yield* Database;
	const unruled = new Map((yield* db.Ruling.where({ ruledAt: null }).select("id", "question").all()).map((row) => [row.id, row.question] as const));
	const rows = yield* db.RulingGate.all();
	return rows.flatMap((row): ReadonlyArray<RulingGate> => {
		const question = unruled.get(row.rulingId);
		return question === undefined ? [] : [{ pieceId: row.pieceId, question, rulingId: row.rulingId }];
	});
});
