import type { berthReclaimFailed } from "@antumbra/domain-reclamation/facts/berth-reclaim-failed.ts";
import { berth as berthRecordSchema } from "@antumbra/domain-reclamation/rows/berth.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const berthReclaimFailedMaterializer = Effect.fn("Reclamation.berthReclaimFailed")(function* (
	fact: FactValue<typeof berthReclaimFailed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.berth.findById(fact.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(berthRecordSchema.Row)), Effect.orDie);
	if (stored.reclaimRequestId !== fact.claimRequestId) return;
	yield* rows.berth.updateVoid({ ...{ reclaimResult: "failed" }, id: fact.id }).pipe(Effect.orDie);
});
