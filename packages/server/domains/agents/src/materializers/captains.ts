import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { captainWorkId } from "@antumbra/domain-voyages/ids.ts";
import { voyageCaptainWork } from "@antumbra/domain-voyages/rows/voyage-captain-work.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
import { atWork } from "#rows/working.ts";
export const captains = projection("agentCaptains", {
	reads: [agent, session, pieceAgent, voyageAgent],
	writes: [voyageCaptainWork],
	run: Effect.fn("Agents.captains")(function* (reads, writes) {
		const agents = yield* reads.agent.where({});
		const sessions = yield* reads.session.where({ parentSessionId: null, status: "open" });
		const working = new Map(agents.map((held) => [held.id, atWork(held, sessions)]));
		const assignments = yield* reads.pieceAgent.where({});
		const voyages = yield* reads.voyageAgent.where({});
		const assigned = new Set(assignments.map((link) => link.agentId));
		const captains = voyages.filter((link) => link.role === "captain" && !assigned.has(link.agentId));
		const desiredCaptains = new Set(captains.map((link) => captainWorkId(link.agentId, link.voyageId)));
		for (const previous of yield* writes.voyageCaptainWork.where({}))
			if (!desiredCaptains.has(previous.id)) yield* writes.voyageCaptainWork.delete(previous.id);
		for (const link of captains) {
			const value = {
				id: captainWorkId(link.agentId, link.voyageId),
				voyageId: link.voyageId,
				agentId: link.agentId,
				working: working.get(link.agentId) ?? false,
			};
			if (yield* writes.voyageCaptainWork.exists(value.id)) yield* writes.voyageCaptainWork.update(value.id, value);
			else yield* writes.voyageCaptainWork.insert(value);
		}
	}),
});
