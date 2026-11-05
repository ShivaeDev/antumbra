import type { berthReclaimed } from "@antumbra/domain-reclamation/facts/berth-reclaimed.ts";
import { berth as berthRecordSchema } from "@antumbra/domain-reclamation/rows/berth.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const berthReclaimedMaterializer = Effect.fn("Reclamation.berthReclaimed")(function* (
	fact: FactValue<typeof berthReclaimed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.berth.findById(fact.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(berthRecordSchema.Row)), Effect.orDie);
	if (stored.reclaimRequestId !== fact.claimRequestId) return;
	yield* rows.berth
		.updateVoid({ ...{ status: "reclaimed", reclaimState: null, reclaimRequestId: null, reclaimResult: null, strandedAt: null }, id: fact.id })
		.pipe(Effect.orDie);
	const siblings = yield* rows.berth
		.findMany({ where: { agentId: stored.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	if (!siblings.some((sibling) => sibling.reclaimState === "claimed"))
		yield* rows.moorage.updateVoid({ ...{ reclaimState: null }, agentId: stored.agentId }).pipe(Effect.orDie);
});
