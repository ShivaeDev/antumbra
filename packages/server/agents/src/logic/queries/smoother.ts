import type * as Source from "@antumbra/domain-agents/queries/smoother.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const smoother = Effect.fn("Agents.smoother")(function* (
	input: Schema.Struct.Type<typeof Source.smoother.input>,
): Effect.fn.Return<typeof Source.smoother.output.Type, never, Records> {
	const rows = yield* Records;

	const ids = new Set(
		(yield* rows.voyageAgent
			.findMany({
				where: { voyageId: input.voyageId, role: "smoother" },
				orderBy: { field: "storage_order", direction: "asc" },
				select: voyageAgentSelection,
			})
			.pipe(Effect.orDie)).map((link) => link.agentId),
	);
	return (
		(yield* rows.agent.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection }).pipe(Effect.orDie))
			.filter((value) => ids.has(value.id) && value.status !== "retired")
			.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0] ?? null
	);
});
