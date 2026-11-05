import type * as Source from "@antumbra/domain-costs/queries/for-agent.ts";
import { countUsage, emptyTally, totalOf } from "@antumbra/domain-costs/queries/tally.ts";
import { selection as sessionUsageSelection } from "@antumbra/server-storage/records/session-usage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const forAgent = Effect.fn("Costs.forAgent")(function* (
	input: Schema.Struct.Type<typeof Source.forAgent.input>,
): Effect.fn.Return<typeof Source.forAgent.output.Type, never, Records> {
	const rows = yield* Records;

	const tally = emptyTally();
	for (const reading of yield* rows.sessionUsage
		.findMany({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionUsageSelection })
		.pipe(Effect.orDie))
		countUsage(tally, reading.usage);
	return totalOf(tally);
});
