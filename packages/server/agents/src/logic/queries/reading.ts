import type * as Source from "@antumbra/domain-agents/queries/reading.ts";
import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const reading = Effect.fn("Agents.reading")(function* (
	input: Schema.Struct.Type<typeof Source.reading.input>,
): Effect.fn.Return<typeof Source.reading.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.agentReading
			.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: agentReadingSelection })
			.pipe(Effect.orDie),
	);
});
