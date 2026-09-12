import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingReclassified } from "#facts/ruling-reclassified.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingReclassifiedMaterializer = materializer(rulingReclassified, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingReclassified")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		const current = yield* rows.ruling.get(fact.rulingId);
		yield* rows.ruling.update(fact.rulingId, {
			radius: fact.radius ?? current.radius,
			urgency: fact.urgency ?? current.urgency,
			reclassifications: [
				...current.reclassifications,
				{ by: fact.by, byAgentId: fact.byAgentId, note: fact.note, radius: fact.radius, urgency: fact.urgency, at },
			],
		});
	}),
});
