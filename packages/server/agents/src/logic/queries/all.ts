import type * as Source from "@antumbra/domain-agents/queries/all.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const all = Effect.fn("Agents.all")(function* (
	_input: Schema.Struct.Type<typeof Source.all.input>,
): Effect.fn.Return<typeof Source.all.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.agent.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection }).pipe(Effect.orDie);
});
