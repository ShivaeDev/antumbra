import { activityId } from "@antumbra/platform-vocabulary/voyage.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageActivitySelection } from "@antumbra/server-storage/records/voyage-activity.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const sessionActivity = Effect.fn("Agents.sessionActivity")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const pieces = new Map(
		(yield* reads.piece
			.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
			.pipe(Effect.orDie)).map((value) => [value.id, value.voyageId]),
	);
	const links = yield* reads.pieceAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
		.pipe(Effect.orDie);
	const voyages = yield* reads.voyageAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
		.pipe(Effect.orDie);
	const desired = new Set<string>();
	for (const root of yield* reads.session
		.findMany({ where: { parentSessionId: null }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie)) {
		const ids = new Set(voyages.filter((link) => link.agentId === root.agentId).map((link) => link.voyageId));
		for (const link of links.filter((link) => link.agentId === root.agentId)) {
			const id = pieces.get(link.pieceId);
			if (id !== undefined) ids.add(id);
		}
		for (const voyageId of ids) {
			const id = activityId("session", root.id, voyageId);
			desired.add(id);
			const value = { id, voyageId, sourceKind: "session" as const, sourceId: root.id, at: root.createdAt };
			if (
				yield* writes.voyageActivity.count({ where: { id: id } }).pipe(
					Effect.map((count) => count > 0),
					Effect.orDie,
				)
			)
				yield* writes.voyageActivity.updateVoid({ ...value, id: id }).pipe(Effect.orDie);
			else yield* writes.voyageActivity.insertVoid(value).pipe(Effect.orDie);
		}
	}
	for (const held of yield* writes.voyageActivity
		.findMany({ where: { sourceKind: "session" }, orderBy: { field: "storage_order", direction: "asc" }, select: voyageActivitySelection })
		.pipe(Effect.orDie))
		if (!desired.has(held.id)) yield* writes.voyageActivity.delete(held.id).pipe(Effect.orDie);
});
