import { resourceOwner } from "@antumbra/domain-reclamation/rows/resource-owner.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { agent } from "#rows/agent.ts";
export const agentWork = projection("agentWork", {
	reads: [agent, session],
	writes: [agent, resourceOwner],
	run: Effect.fn("Agents.work")(function* (reads, writes) {
		const agents = yield* reads.agent.where({});
		const sessions = yield* reads.session.where({});
		for (const held of agents) {
			const current = sessions.find((candidate) => candidate.id === held.currentSessionId && candidate.parentSessionId === null);
			const activated = held.status === "spawning" && current?.charterDeliveredAt !== null && current?.charterDeliveredAt !== undefined;
			const status = activated ? "alive" : held.status;
			if (activated && current !== undefined)
				yield* writes.agent.update(held.id, { status, updatedAt: current.charterDeliveredAt ?? held.updatedAt });
			const owner = {
				agentId: held.id,
				status,
				openSessions: sessions.filter((candidate) => candidate.agentId === held.id && candidate.status === "open").length,
			};
			if (yield* writes.resourceOwner.exists(held.id)) yield* writes.resourceOwner.update(held.id, owner);
			else yield* writes.resourceOwner.insert(owner);
		}
	}),
});
