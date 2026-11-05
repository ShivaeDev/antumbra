import type * as Source from "@antumbra/domain-costs/queries/for-voyage.ts";
import { countUsage, emptyTally, totalOf } from "@antumbra/domain-costs/queries/tally.ts";
import { selection as sessionUsageSelection } from "@antumbra/server-storage/records/session-usage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import type { Schema } from "effect";
import { Effect } from "effect";

export const forVoyage = Effect.fn("Costs.forVoyage")(function* (
	input: Schema.Struct.Type<typeof Source.forVoyage.input>,
): Effect.fn.Return<typeof Source.forVoyage.output.Type, never, Records> {
	const rows = yield* Records;

	const agents = new Set<string>(
		(yield* rows.voyageAgent
			.findMany({ where: { voyageId: input.voyageId }, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
			.pipe(Effect.orDie)).map((crew) => crew.agentId),
	);
	const tally = emptyTally();
	for (const reading of yield* rows.sessionUsage
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionUsageSelection })
		.pipe(Effect.orDie))
		if (agents.has(reading.agentId)) countUsage(tally, reading.usage);
	return totalOf(tally);
});
