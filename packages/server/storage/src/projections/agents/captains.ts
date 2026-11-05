import { atWork } from "@antumbra/domain-agents/rows/working.ts";
import { captainWorkId } from "@antumbra/domain-voyages/ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { selection as voyageCaptainWorkSelection } from "@antumbra/server-storage/records/voyage-captain-work.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const captains = Effect.fn("Agents.captains")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const agents = yield* reads.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie);
	const sessions = yield* reads.session
		.findMany({ where: { parentSessionId: null, status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const working = new Map(agents.map((held) => [held.id, atWork(held, sessions)]));
	const assignments = yield* reads.pieceAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
		.pipe(Effect.orDie);
	const voyages = yield* reads.voyageAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
		.pipe(Effect.orDie);
	const assigned = new Set(assignments.map((link) => link.agentId));
	const captains = voyages.filter((link) => link.role === "captain" && !assigned.has(link.agentId));
	const desiredCaptains = new Set(captains.map((link) => captainWorkId(link.agentId, link.voyageId)));
	for (const previous of yield* writes.voyageCaptainWork
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageCaptainWorkSelection })
		.pipe(Effect.orDie))
		if (!desiredCaptains.has(previous.id)) yield* writes.voyageCaptainWork.delete(previous.id).pipe(Effect.orDie);
	for (const link of captains) {
		const value = {
			id: captainWorkId(link.agentId, link.voyageId),
			voyageId: link.voyageId,
			agentId: link.agentId,
			working: working.get(link.agentId) ?? false,
		};
		if (
			yield* writes.voyageCaptainWork.count({ where: { id: value.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* writes.voyageCaptainWork.updateVoid({ ...value, id: value.id }).pipe(Effect.orDie);
		else yield* writes.voyageCaptainWork.insertVoid(value).pipe(Effect.orDie);
	}
});
