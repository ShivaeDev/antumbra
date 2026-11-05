import type { rulingAnswered } from "@antumbra/domain-rulings/facts/ruling-answered.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as rulingGateSelection } from "@antumbra/server-storage/records/ruling-gate.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const rulingAnsweredMaterializer = Effect.fn("rulings.answered")(function* (
	fact: FactValue<typeof rulingAnswered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.ruling
		.updateVoid({
			...{
				answer: { text: fact.answer, choiceId: fact.choiceId, by: fact.by, byAgentId: fact.byAgentId, at: new Date(fact.at).toISOString() },
			},
			id: fact.rulingId,
		})
		.pipe(Effect.orDie);
	for (const gate of yield* rows.rulingGate
		.findMany({ where: { rulingId: fact.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingGateSelection })
		.pipe(Effect.orDie)) {
		yield* rows.rulingGate.updateVoid({ ...{ open: false }, id: gate.id }).pipe(Effect.orDie);
		yield* rows.pieceRulingGate.delete(gate.id).pipe(Effect.orDie);
	}
});
