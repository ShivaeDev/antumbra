import type * as Source from "@antumbra/domain-agents/queries/working-count.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const workingCount = Effect.fn("Agents.workingCount")(function* (
	_input: Schema.Struct.Type<typeof Source.workingCount.input>,
): Effect.fn.Return<typeof Source.workingCount.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.agentReading.count({ where: { working: true } }).pipe(Effect.orDie);
});
