import { atWork } from "@antumbra/domain-agents/rows/working.ts";
import { assignmentWorkId } from "@antumbra/domain-pieces/ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as pieceAssignmentWorkSelection } from "@antumbra/server-storage/records/piece-assignment-work.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const assignments = Effect.fn("Agents.assignments")(function* (): Effect.fn.Return<void, never, Records> {
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
	const desiredAssignments = new Set(assignments.map((link) => assignmentWorkId(link.agentId, link.pieceId)));
	for (const previous of yield* writes.pieceAssignmentWork
		.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceAssignmentWorkSelection })
		.pipe(Effect.orDie))
		if (!desiredAssignments.has(previous.id)) yield* writes.pieceAssignmentWork.delete(previous.id).pipe(Effect.orDie);
	for (const link of assignments) {
		const value = {
			id: assignmentWorkId(link.agentId, link.pieceId),
			pieceId: link.pieceId,
			agentId: link.agentId,
			working: working.get(link.agentId) ?? false,
		};
		if (
			yield* writes.pieceAssignmentWork.count({ where: { id: value.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* writes.pieceAssignmentWork.updateVoid({ ...value, id: value.id }).pipe(Effect.orDie);
		else yield* writes.pieceAssignmentWork.insertVoid(value).pipe(Effect.orDie);
	}
});
