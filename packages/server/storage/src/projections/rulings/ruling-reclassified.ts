import type { rulingReclassified } from "@antumbra/domain-rulings/facts/ruling-reclassified.ts";
import { ruling as rulingRecordSchema } from "@antumbra/domain-rulings/rows/ruling.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";
export const rulingReclassifiedMaterializer = Effect.fn("rulings.rulingReclassified")(function* (
	fact: FactValue<typeof rulingReclassified>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	const current = yield* rows.ruling.findById(fact.rulingId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(rulingRecordSchema.Row)), Effect.orDie);
	yield* rows.ruling
		.updateVoid({
			...{
				radius: fact.radius ?? current.radius,
				urgency: fact.urgency ?? current.urgency,
				reclassifications: [
					...current.reclassifications,
					{ by: fact.by, byAgentId: fact.byAgentId, note: fact.note, radius: fact.radius, urgency: fact.urgency, at },
				],
			},
			id: fact.rulingId,
		})
		.pipe(Effect.orDie);
});
