import type * as Source from "@antumbra/domain-agents/queries/by-voyage.ts";
import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const byVoyage = Effect.fn("Agents.byVoyage")(function* (
	input: Schema.Struct.Type<typeof Source.byVoyage.input>,
): Effect.fn.Return<typeof Source.byVoyage.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.agentReading
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentReadingSelection })
		.pipe(Effect.orDie)).filter((held) => held.voyageIds.includes(input.voyageId));
});
