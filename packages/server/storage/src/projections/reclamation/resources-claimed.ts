import type { resourcesClaimed } from "@antumbra/domain-reclamation/facts/resources-claimed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { reclaimRequestId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const resourcesClaimedMaterializer = Effect.fn("Reclamation.resourcesClaimed")(function* (
	fact: FactValue<typeof resourcesClaimed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.moorage.updateVoid({ ...{ reclaimState: "claimed" }, agentId: fact.agentId }).pipe(Effect.orDie);
	for (const id of fact.berthIds) {
		yield* rows.berth
			.updateVoid({ ...{ reclaimRequestId: reclaimRequestId(fact.requestId, id), reclaimResult: null, reclaimState: "claimed" }, id: id })
			.pipe(Effect.orDie);
	}
});
