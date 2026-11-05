import type { berthHeld } from "@antumbra/domain-reclamation/facts/berth-held.ts";
import { berth as berthRecordSchema } from "@antumbra/domain-reclamation/rows/berth.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const berthHeldMaterializer = Effect.fn("Reclamation.berthHeld")(function* (
	fact: FactValue<typeof berthHeld>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.berth.findById(fact.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(berthRecordSchema.Row)), Effect.orDie);
	if (stored.reclaimRequestId !== fact.claimRequestId) return;
	yield* rows.berth
		.updateVoid({ ...{ reclaimResult: "held", status: "stranded", strandedAt: stored.strandedAt ?? fact.at }, id: fact.id })
		.pipe(Effect.orDie);
});
