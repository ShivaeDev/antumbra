import type * as Source from "@antumbra/domain-agents/queries/by-session.ts";
import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const bySession = Effect.fn("Agents.bySession")(function* (
	input: Schema.Struct.Type<typeof Source.bySession.input>,
): Effect.fn.Return<typeof Source.bySession.output.Type, never, Records> {
	const rows = yield* Records;

	return (
		(yield* rows.agentReading
			.findMany({
				where: { currentSessionId: input.sessionId },
				orderBy: { field: "storage_order", direction: "asc" },
				select: agentReadingSelection,
			})
			.pipe(Effect.orDie))[0] ?? null
	);
});
