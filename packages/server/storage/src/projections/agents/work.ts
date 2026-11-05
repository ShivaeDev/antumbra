import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const agentWork = Effect.fn("Agents.work")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const agents = yield* reads.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie);
	const sessions = yield* reads.session
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	for (const held of agents) {
		const current = sessions.find((candidate) => candidate.id === held.currentSessionId && candidate.parentSessionId === null);
		const activated = held.status === "spawning" && current?.charterDeliveredAt !== null && current?.charterDeliveredAt !== undefined;
		const status = activated ? "alive" : held.status;
		if (activated && current !== undefined)
			yield* writes.agent.updateVoid({ ...{ status, updatedAt: current.charterDeliveredAt ?? held.updatedAt }, id: held.id }).pipe(Effect.orDie);
		if (held.role === "smoother" && current?.status === "closed")
			yield* writes.agent.updateVoid({ ...{ currentSessionId: null }, id: held.id }).pipe(Effect.orDie);
		const owner = {
			agentId: held.id,
			status,
			openSessions: sessions.filter((candidate) => candidate.agentId === held.id && candidate.status === "open").length,
		};
		if (
			yield* writes.resourceOwner.count({ where: { agentId: held.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* writes.resourceOwner.updateVoid({ ...owner, agentId: held.id }).pipe(Effect.orDie);
		else yield* writes.resourceOwner.insertVoid(owner).pipe(Effect.orDie);
	}
});
