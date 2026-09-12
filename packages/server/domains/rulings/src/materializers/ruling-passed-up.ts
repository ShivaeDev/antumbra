import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingPassedUp } from "#facts/ruling-passed-up.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingPassedUpMaterializer = materializer(rulingPassedUp, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingPassedUp")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		const current = yield* rows.ruling.get(fact.rulingId);
		yield* rows.ruling.update(fact.rulingId, {
			rung: fact.by === "captain" ? "flagship" : "admiral",
			reclassifications: [...current.reclassifications, { by: fact.by, byAgentId: fact.byAgentId, note: fact.note, radius: null, urgency: null, at }],
		});
	}),
});
