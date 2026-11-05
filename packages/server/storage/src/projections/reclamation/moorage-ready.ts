import type { moorageReady } from "@antumbra/domain-reclamation/facts/moorage-ready.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const moorageReadyMaterializer = Effect.fn("Reclamation.moorageReady")(function* (
	fact: FactValue<typeof moorageReady>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.moorage.updateVoid({ ...{ status: "ready" }, agentId: fact.agentId }).pipe(Effect.orDie);
	for (const site of yield* rows.berth
		.findMany({ where: { agentId: fact.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie))
		yield* rows.berth.updateVoid({ ...{ status: "ready" }, id: site.id }).pipe(Effect.orDie);
});
