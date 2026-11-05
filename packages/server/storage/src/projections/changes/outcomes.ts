import type { change } from "@antumbra/domain-changes/rows/change.ts";
import type { pieceChange } from "@antumbra/domain-changes/rows/piece-change.ts";
import { type pieceOutcome, pieceOutcome as pieceOutcomeRecordSchema } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import type { heldResource } from "@antumbra/domain-reclamation/rows/held-resource.ts";
import type { voyageActivity } from "@antumbra/domain-voyages/rows/voyage-activity.ts";
import { unresolvedChangeIds } from "@antumbra/platform-vocabulary/change-outcomes.ts";
import { outcomeId } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { heldResourceId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { activityId } from "@antumbra/platform-vocabulary/voyage.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as changeVerdictSelection } from "@antumbra/server-storage/records/change-verdict.ts";
import { selection as heldResourceSelection } from "@antumbra/server-storage/records/held-resource.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { selection as pieceOutcomeSelection } from "@antumbra/server-storage/records/piece-outcome.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { selection as voyageActivitySelection } from "@antumbra/server-storage/records/voyage-activity.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

type World = { changes: readonly (typeof change.Row.Type)[]; links: readonly (typeof pieceChange.Row.Type)[]; dismissed: ReadonlySet<string> };
const desiredOutcomes = ({ changes, links, dismissed }: World) => {
	const lookup = new Map(changes.map((row) => [row.id, row]));
	const desired: Array<typeof pieceOutcome.Row.Type> = [];
	for (const pieceId of new Set(links.map((row) => row.pieceId))) {
		const pieceLinks = links.filter((row) => row.pieceId === pieceId);
		const pending = unresolvedChangeIds({ changes, pieceChanges: pieceLinks, dismissedChangeIds: dismissed });
		for (const link of pieceLinks) {
			const held = lookup.get(link.changeId);
			if (held !== undefined && (held.stage === "landed" || pending.has(held.id)))
				desired.push({
					id: outcomeId("change", held.id, pieceId),
					pieceId,
					sourceKind: "change",
					sourceId: held.id,
					status: held.stage === "landed" ? "landed" : "pending",
				});
		}
	}

	return desired;
};
const syncOutcomes = Effect.fn("changes.syncOutcomes")(function* (desired: readonly (typeof pieceOutcome.Row.Type)[]) {
	const reads = yield* Records;
	const writes = yield* Records;

	const wanted = new Map(desired.map((row) => [row.id, row]));
	for (const current of yield* reads.pieceOutcome
		.findMany({ where: { sourceKind: "change" }, orderBy: { field: "id", direction: "asc" }, select: pieceOutcomeSelection })
		.pipe(Effect.orDie))
		if (!wanted.has(current.id)) yield* writes.pieceOutcome.delete(current.id).pipe(Effect.orDie);
	for (const row of desired) {
		if (
			yield* reads.pieceOutcome.count({ where: { id: row.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		) {
			const before = yield* reads.pieceOutcome
				.findById(row.id)
				.pipe(Effect.flatMap(Schema.decodeUnknownEffect(pieceOutcomeRecordSchema.Row)), Effect.orDie);
			if (before.status !== row.status) yield* writes.pieceOutcome.updateVoid({ ...row, id: row.id }).pipe(Effect.orDie);
		} else yield* writes.pieceOutcome.insertVoid(row).pipe(Effect.orDie);
	}
});
const syncHolds = Effect.fn("changes.syncHolds")(function* ({ changes, links, dismissed }: World) {
	const reads = yield* Records;
	const writes = yield* Records;

	const unresolved = unresolvedChangeIds({ changes, pieceChanges: links, dismissedChangeIds: dismissed });
	const repositories = new Map(
		(yield* reads.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie)).map(
			(row) => [row.id, row],
		),
	);
	const holds: Array<typeof heldResource.Row.Type> = [];
	for (const resource of yield* reads.berth
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie))
		for (const held of changes)
			if (unresolved.has(held.id) && repositories.get(held.repoId)?.source === resource.source && held.headRef === resource.branch)
				holds.push({ id: heldResourceId(resource.id, held.id), berthId: resource.id, changeId: held.id });
	const holdIds = new Set(holds.map((row) => row.id));
	for (const held of yield* reads.heldResource
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: heldResourceSelection })
		.pipe(Effect.orDie))
		if (!holdIds.has(held.id)) yield* writes.heldResource.delete(held.id).pipe(Effect.orDie);
	for (const held of holds)
		if (
			!(yield* reads.heldResource.count({ where: { id: held.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			))
		)
			yield* writes.heldResource.insertVoid(held).pipe(Effect.orDie);
});
const syncActivity = Effect.fn("changes.syncActivity")(function* ({ changes, links }: World) {
	const reads = yield* Records;
	const writes = yield* Records;

	const pieces = new Map(
		(yield* reads.piece
			.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
			.pipe(Effect.orDie)).map((row) => [row.id, row]),
	);
	const byChange = Map.groupBy(links, (link) => link.changeId);
	const desired = new Map<string, typeof voyageActivity.Row.Type>();
	for (const change of changes)
		for (const link of byChange.get(change.id) ?? []) {
			const piece = pieces.get(link.pieceId);
			if (piece !== undefined) {
				const id = activityId("change", change.id, piece.voyageId);
				desired.set(id, { id, voyageId: piece.voyageId, sourceKind: "change", sourceId: change.id, at: change.activityAt });
			}
		}
	const existing = yield* reads.voyageActivity
		.findMany({ where: { sourceKind: "change" }, orderBy: { field: "storage_order", direction: "asc" }, select: voyageActivitySelection })
		.pipe(Effect.orDie);
	for (const held of existing) if (!desired.has(held.id)) yield* writes.voyageActivity.delete(held.id).pipe(Effect.orDie);
	for (const row of desired.values()) {
		const held = existing.find((candidate) => candidate.id === row.id);
		if (held === undefined) yield* writes.voyageActivity.insertVoid(row).pipe(Effect.orDie);
		else if (held.at !== row.at) yield* writes.voyageActivity.updateVoid({ ...{ at: row.at }, id: row.id }).pipe(Effect.orDie);
	}
});
export const outcomes = Effect.fn("changes.outcomes")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;

	const world = {
		changes: yield* reads.change
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
			.pipe(Effect.orDie),
		links: yield* reads.pieceChange
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
			.pipe(Effect.orDie),
		dismissed: new Set(
			(yield* reads.changeVerdict
				.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeVerdictSelection })
				.pipe(Effect.orDie)).map((row) => row.changeId),
		),
	};
	yield* syncOutcomes(desiredOutcomes(world));
	yield* syncHolds(world);
	yield* syncActivity(world);
});
