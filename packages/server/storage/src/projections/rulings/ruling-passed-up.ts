import type { rulingPassedUp } from "@antumbra/domain-rulings/facts/ruling-passed-up.ts";
import { ruling as rulingRecordSchema } from "@antumbra/domain-rulings/rows/ruling.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";
export const rulingPassedUpMaterializer = Effect.fn("rulings.rulingPassedUp")(function* (
	fact: FactValue<typeof rulingPassedUp>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	const current = yield* rows.ruling.findById(fact.rulingId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(rulingRecordSchema.Row)), Effect.orDie);
	yield* rows.ruling
		.updateVoid({
			...{
				rung: fact.by === "captain" ? "flagship" : "admiral",
				reclassifications: [
					...current.reclassifications,
					{ by: fact.by, byAgentId: fact.byAgentId, note: fact.note, radius: null, urgency: null, at },
				],
			},
			id: fact.rulingId,
		})
		.pipe(Effect.orDie);
});
