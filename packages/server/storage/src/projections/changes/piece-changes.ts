import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { selection as pieceChangeViewSelection } from "@antumbra/server-storage/records/piece-change-view.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const pieceChangesProjection = Effect.fn("changes.pieceChangesProjection")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const changes = new Map(
		(yield* reads.change
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
			.pipe(Effect.orDie)).map((row) => [row.id, row]),
	);
	const repos = new Map(
		(yield* reads.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie)).map(
			(row) => [row.id, row],
		),
	);
	const desired = (yield* reads.pieceChange
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
		.pipe(Effect.orDie)).flatMap((link) => {
		const held = changes.get(link.changeId);
		return held === undefined ? [] : [{ ...held, rowId: link.id, pieceId: link.pieceId, repoName: repos.get(held.repoId)?.name ?? held.repoId }];
	});
	const current = new Map(
		(yield* reads.pieceChangeView
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeViewSelection })
			.pipe(Effect.orDie)).map((row) => [row.rowId, row]),
	);
	const wanted = new Set(desired.map((row) => row.rowId));
	for (const row of current.values()) if (!wanted.has(row.rowId)) yield* writes.pieceChangeView.delete(row.rowId).pipe(Effect.orDie);
	for (const row of desired) {
		const before = current.get(row.rowId);
		if (before === undefined) yield* writes.pieceChangeView.insertVoid(row).pipe(Effect.orDie);
		else if (JSON.stringify(before) !== JSON.stringify(row))
			yield* writes.pieceChangeView.updateVoid({ ...row, rowId: row.rowId }).pipe(Effect.orDie);
	}
});
