import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingGate } from "#model.ts";

export const openGatesForPieces = Effect.fn("Rulings.openGatesForPieces")(function* (pieceIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const gates = yield* db.RulingGate.where((gate) => gate.pieceId.in(pieceIds)).all();
	const rulings = yield* db.Ruling.where({ ruledAt: null })
		.where((ruling) => ruling.id.in(gates.map((gate) => gate.rulingId)))
		.all();
	const questions = new Map(rulings.map((ruling) => [ruling.id, ruling.question]));
	return gates.flatMap((gate): ReadonlyArray<RulingGate> => {
		const question = questions.get(gate.rulingId);
		return question === undefined ? [] : [{ ...gate, question }];
	});
});
