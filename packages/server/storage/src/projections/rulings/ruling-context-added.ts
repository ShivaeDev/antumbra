import type { rulingContextAdded } from "@antumbra/domain-rulings/facts/ruling-context-added.ts";
import { ruling as rulingRecordSchema } from "@antumbra/domain-rulings/rows/ruling.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";
export const rulingContextAddedMaterializer = Effect.fn("rulings.rulingContextAdded")(function* (
	fact: FactValue<typeof rulingContextAdded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const at = new Date(fact.at).toISOString();
	const current = yield* rows.ruling.findById(fact.rulingId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(rulingRecordSchema.Row)), Effect.orDie);
	yield* rows.ruling
		.updateVoid({
			...{
				contexts: [...current.contexts, { id: fact.requestId, authorAgentId: fact.authorAgentId, body: fact.body, at }],
			},
			id: fact.rulingId,
		})
		.pipe(Effect.orDie);
});
