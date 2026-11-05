import type * as Source from "@antumbra/domain-agents/queries/captain.ts";
import { atWork } from "@antumbra/domain-agents/rows/working.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const captain = Effect.fn("Agents.captain")(function* (
	input: Schema.Struct.Type<typeof Source.captain.input>,
): Effect.fn.Return<typeof Source.captain.output.Type, never, Records> {
	const rows = yield* Records;

	const links = yield* rows.voyageAgent
		.findMany({
			where: { voyageId: input.voyageId, role: "captain" },
			orderBy: { field: "storage_order", direction: "asc" },
			select: voyageAgentSelection,
		})
		.pipe(Effect.orDie);
	const assigned = new Set(
		(yield* rows.pieceAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
			.pipe(Effect.orDie)).map((link) => link.agentId),
	);
	const ids = new Set(links.filter((link) => !assigned.has(link.agentId)).map((link) => link.agentId));
	const candidates = (yield* rows.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie))
		.filter((held) => ids.has(held.id))
		.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
	const sessions = yield* rows.session
		.findMany({ where: { parentSessionId: null, status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	return candidates.find((held) => atWork(held, sessions)) ?? candidates.at(-1) ?? null;
});
