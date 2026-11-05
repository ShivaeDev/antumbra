import type { mooragePlanned } from "@antumbra/domain-reclamation/facts/moorage-planned.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { berthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const mooragePlannedMaterializer = Effect.fn("Reclamation.mooragePlanned")(function* (
	fact: FactValue<typeof mooragePlanned>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		yield* rows.moorage.count({ where: { agentId: fact.agentId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		return;
	yield* rows.moorage
		.insertVoid({ agentId: fact.agentId, runner: fact.runner, root: fact.plan.root, status: "provisioning", reclaimState: null })
		.pipe(Effect.orDie);
	for (const planned of fact.plan.berths) {
		yield* rows.berth
			.insertVoid({
				...planned,
				id: berthId(fact.agentId, planned.slug),
				agentId: fact.agentId,
				runner: fact.runner,
				status: "provisioning",
				reclaimState: null,
				reclaimRequestId: null,
				reclaimResult: null,
				strandedAt: null,
			})
			.pipe(Effect.orDie);
	}
});
