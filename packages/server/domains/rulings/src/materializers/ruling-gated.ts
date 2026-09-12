import { rulingGateId } from "@antumbra/domain-pieces/ids.ts";
import { pieceRulingGate } from "@antumbra/domain-pieces/rows/piece-ruling-gate.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingGated } from "#facts/ruling-gated.ts";
import { rulingGate } from "#rows/gate.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingGatedMaterializer = materializer(rulingGated, {
	writes: [ruling, rulingGate, pieceRulingGate],
	run: Effect.fn("rulings.gated")(function* (fact, rows) {
		const current = yield* rows.ruling.get(fact.rulingId);
		for (const pieceId of new Set(fact.pieceIds)) {
			const id = rulingGateId(fact.rulingId, pieceId);
			if (yield* rows.rulingGate.exists(id)) continue;
			yield* rows.rulingGate.insert({ id, rulingId: fact.rulingId, pieceId, question: current.question, open: true });
			yield* rows.pieceRulingGate.insert({ id, rulingId: fact.rulingId, pieceId });
		}
	}),
});
