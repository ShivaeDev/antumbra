import { voyageProgress } from "@antumbra/domain-voyages/rows/voyage-progress.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageActivitySelection } from "@antumbra/server-storage/records/voyage-activity.ts";
import { selection as voyageCaptainWorkSelection } from "@antumbra/server-storage/records/voyage-captain-work.ts";
import { selection as voyagePieceProgressSelection } from "@antumbra/server-storage/records/voyage-piece-progress.ts";
import { selection as voyageProgressSelection } from "@antumbra/server-storage/records/voyage-progress.ts";
import { Effect, Option, Schema } from "effect";
import { Records } from "#records.ts";

const sameProgress = Schema.toEquivalence(voyageProgress.Row);

export const voyageProgressProjection = Effect.fn("Voyages.projectProgress")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const voyages = yield* reads.voyage
		.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie);
	const activities = Map.groupBy(
		yield* reads.voyageActivity
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageActivitySelection })
			.pipe(Effect.orDie),
		(activity) => activity.voyageId,
	);
	const members = Map.groupBy(
		yield* reads.voyagePieceProgress
			.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: voyagePieceProgressSelection })
			.pipe(Effect.orDie),
		(piece) => piece.voyageId,
	);
	const working = new Set(
		(yield* reads.voyageCaptainWork
			.findMany({ where: { working: true }, orderBy: { field: "storage_order", direction: "asc" }, select: voyageCaptainWorkSelection })
			.pipe(Effect.orDie)).map((captain) => captain.voyageId),
	);
	for (const voyage of voyages) {
		const pieces = members.get(voyage.id) ?? [];
		const moments = [
			...pieces.flatMap((piece) => (piece.lastStirredAt === null ? [] : [piece.lastStirredAt])),
			...(activities.get(voyage.id) ?? []).map((activity) => activity.at),
		];
		const counts = { abandoned: 0, active: 0, blocked: 0, done: 0, held: 0, landing: 0, parked: 0, ready: 0 };
		for (const piece of pieces) counts[piece.state] += 1;
		const next = {
			id: voyage.id,
			total: pieces.length,
			lastStirredAt: moments.toSorted().at(-1) ?? null,
			counts,
			state: counts.active > 0 || working.has(voyage.id) ? ("underWay" as const) : ("quiet" as const),
			concluded: pieces.length > 0 && pieces.every((piece) => piece.concluded),
		};
		const current = yield* writes.voyageProgress
			.findOne({ where: { id: voyage.id }, orderBy: { field: "id", direction: "asc" }, select: voyageProgressSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(current)) yield* writes.voyageProgress.insertVoid(next).pipe(Effect.orDie);
		else if (!sameProgress(current.value, next)) yield* writes.voyageProgress.updateVoid({ ...next, id: next.id }).pipe(Effect.orDie);
	}
});
