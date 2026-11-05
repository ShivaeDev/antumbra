import type * as Source from "@antumbra/domain-agents/queries/by-id.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const byId = Effect.fn("Agents.byId")(function* (
	input: Schema.Struct.Type<typeof Source.byId.input>,
): Effect.fn.Return<typeof Source.byId.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.agent
			.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
			.pipe(Effect.orDie),
	);
});
