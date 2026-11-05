import type { birthCancelled } from "@antumbra/domain-agents/facts/birth-cancelled.ts";
import { birth as birthRecordSchema } from "@antumbra/domain-agents/rows/birth.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { pieceAgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";
export const birthCancelledMaterializer = Effect.fn("Agents.BirthCancelled")(function* (
	fact: FactValue<typeof birthCancelled>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const held = yield* rows.birth.findById(fact.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(birthRecordSchema.Row)), Effect.orDie);
	yield* rows.birth.updateVoid({ ...{ status: "cancelled", detail: null }, id: fact.id }).pipe(Effect.orDie);
	yield* rows.agent
		.updateVoid({
			...{
				status: held.createsAgent ? "dormant" : "alive",
				currentSessionId: null,
				updatedAt: new Date(fact.at).toISOString(),
			},
			id: held.agentId,
		})
		.pipe(Effect.orDie);
	if (held.pieceId !== null) yield* rows.pieceAgent.delete(pieceAgentId(held.pieceId, held.agentId)).pipe(Effect.orDie);
});
