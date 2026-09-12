import { assignmentWorkId } from "@antumbra/domain-pieces/ids.ts";
import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { atWork } from "#work.ts";
export const assignments = projection("agentAssignments", {
	reads: [agent, session, pieceAgent],
	writes: [pieceAssignmentWork],
	run: Effect.fn("Agents.assignments")(function* (reads, writes) {
		const agents = yield* reads.agent.where({});
		const sessions = yield* reads.session.where({ parentSessionId: null, status: "open" });
		const working = new Map(agents.map((held) => [held.id, atWork(held, sessions)]));
		const assignments = yield* reads.pieceAgent.where({});
		const desiredAssignments = new Set(assignments.map((link) => assignmentWorkId(link.agentId, link.pieceId)));
		for (const previous of yield* writes.pieceAssignmentWork.where({}))
			if (!desiredAssignments.has(previous.id)) yield* writes.pieceAssignmentWork.delete(previous.id);
		for (const link of assignments) {
			const value = {
				id: assignmentWorkId(link.agentId, link.pieceId),
				pieceId: link.pieceId,
				agentId: link.agentId,
				working: working.get(link.agentId) ?? false,
			};
			if (yield* writes.pieceAssignmentWork.exists(value.id)) yield* writes.pieceAssignmentWork.update(value.id, value);
			else yield* writes.pieceAssignmentWork.insert(value);
		}
	}),
});
