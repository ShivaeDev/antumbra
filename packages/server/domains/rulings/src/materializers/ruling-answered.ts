import { pieceRulingGate } from "@antumbra/domain-pieces/rows/piece-ruling-gate.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingAnswered } from "#facts/ruling-answered.ts";
import { rulingGate } from "#rows/gate.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingAnsweredMaterializer = materializer(rulingAnswered, {
	writes: [ruling, rulingGate, pieceRulingGate],
	run: Effect.fn("rulings.answered")(function* (fact, rows) {
		yield* rows.ruling.update(fact.rulingId, {
			answer: { text: fact.answer, choiceId: fact.choiceId, by: fact.by, byAgentId: fact.byAgentId, at: new Date(fact.at).toISOString() },
		});
		for (const gate of yield* rows.rulingGate.where({ rulingId: fact.rulingId })) {
			yield* rows.rulingGate.update(gate.id, { open: false });
			yield* rows.pieceRulingGate.delete(gate.id);
		}
	}),
});
