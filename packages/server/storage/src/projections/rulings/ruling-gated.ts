import { rulingGateId } from "@antumbra/domain-pieces/ids.ts";
import type { rulingGated } from "@antumbra/domain-rulings/facts/ruling-gated.ts";
import { ruling as rulingRecordSchema } from "@antumbra/domain-rulings/rows/ruling.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";
export const rulingGatedMaterializer = Effect.fn("rulings.gated")(function* (
	fact: FactValue<typeof rulingGated>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const current = yield* rows.ruling.findById(fact.rulingId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(rulingRecordSchema.Row)), Effect.orDie);
	for (const pieceId of new Set(fact.pieceIds)) {
		const id = rulingGateId(fact.rulingId, pieceId);
		if (
			yield* rows.rulingGate.count({ where: { id: id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			continue;
		yield* rows.rulingGate.insertVoid({ id, rulingId: fact.rulingId, pieceId, question: current.question, open: true }).pipe(Effect.orDie);
		yield* rows.pieceRulingGate.insertVoid({ id, rulingId: fact.rulingId, pieceId }).pipe(Effect.orDie);
	}
});
