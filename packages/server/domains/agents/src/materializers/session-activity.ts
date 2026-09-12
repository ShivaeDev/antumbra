import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { activityId } from "@antumbra/domain-voyages/ids.ts";
import { voyageActivity } from "@antumbra/domain-voyages/rows/voyage-activity.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const sessionActivity = projection("agentSessionActivity", {
	reads: [session, piece, pieceAgent, voyageAgent],
	writes: [voyageActivity],
	run: Effect.fn("Agents.sessionActivity")(function* (reads, writes) {
		const pieces = new Map((yield* reads.piece.where({})).map((value) => [value.id, value.voyageId]));
		const links = yield* reads.pieceAgent.where({});
		const voyages = yield* reads.voyageAgent.where({});
		const desired = new Set<string>();
		for (const root of yield* reads.session.where({ parentSessionId: null })) {
			const ids = new Set(voyages.filter((link) => link.agentId === root.agentId).map((link) => link.voyageId));
			for (const link of links.filter((link) => link.agentId === root.agentId)) {
				const id = pieces.get(link.pieceId);
				if (id !== undefined) ids.add(id);
			}
			for (const voyageId of ids) {
				const id = activityId("session", root.id, voyageId);
				desired.add(id);
				const value = { id, voyageId, sourceKind: "session" as const, sourceId: root.id, at: root.createdAt };
				if (yield* writes.voyageActivity.exists(id)) yield* writes.voyageActivity.update(id, value);
				else yield* writes.voyageActivity.insert(value);
			}
		}
		for (const held of yield* writes.voyageActivity.where({ sourceKind: "session" }))
			if (!desired.has(held.id)) yield* writes.voyageActivity.delete(held.id);
	}),
});
