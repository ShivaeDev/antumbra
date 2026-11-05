import type * as Source from "@antumbra/domain-agents/queries/pending-operations.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { quietIds } from "@antumbra/domain-voyages/rows/voyage.ts";
import { pending } from "@antumbra/server-sessions/logic/queries/pending.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const pendingOperations = Effect.fn("Agents.pendingOperations")(function* (
	_input: Schema.Struct.Type<typeof Source.pendingOperations.input>,
): Effect.fn.Return<typeof Source.pendingOperations.output.Type, never, Records> {
	const rows = yield* Records;

	const quiet = quietIds(
		yield* rows.voyage.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection }).pipe(Effect.orDie),
	);
	const hushed = new Set(
		(yield* rows.voyageAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
			.pipe(Effect.orDie))
			.filter((crew) => quiet.has(crew.voyageId))
			.map((crew) => String(crew.agentId)),
	);
	const sailed = new Map(
		(yield* rows.session
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie)).map((root) => [String(root.id), String(root.agentId)]),
	);
	const sending: Array<typeof sessionOperation.Row.Type> = [];
	for (const operation of yield* pending({})) {
		const agentId = sailed.get(String(operation.sessionId));
		if (operation.gatedBy !== null && agentId !== undefined && hushed.has(agentId)) continue;
		sending.push(operation);
	}
	return sending;
});
