import type * as Source from "@antumbra/domain-agents/queries/roster.ts";
import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const roster = Effect.fn("Agents.roster")(function* (
	_input: Schema.Struct.Type<typeof Source.roster.input>,
): Effect.fn.Return<typeof Source.roster.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.agentReading
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentReadingSelection })
		.pipe(Effect.orDie)).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
});
