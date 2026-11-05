import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import type { quayChange } from "@antumbra/domain-changes/rows/quay-change.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as changeVerdictSelection } from "@antumbra/server-storage/records/change-verdict.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { selection as quayChangeSelection } from "@antumbra/server-storage/records/quay-change.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

const group = (held: ChangeRow): typeof quayChange.Row.Type.group => {
	if (held.archivedAt !== null) return "archived";
	if (held.stage === "landed" || held.stage === "withdrawn") return "landed";
	if (held.draftAt !== null) return "draft";
	if (held.checks === "red" || held.review === "changes_requested" || held.mergeable === "conflict") return "needsAttention";
	return held.mergeable === "clean" && held.checks !== "pending" ? "alongside" : "checksRunning";
};
export const quayProjection = Effect.fn("changes.quayProjection")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const dismissed = new Set(
		(yield* reads.changeVerdict
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeVerdictSelection })
			.pipe(Effect.orDie)).map((row) => row.changeId),
	);
	const repositories = new Map(
		(yield* reads.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie)).map(
			(row) => [row.id, row],
		),
	);
	const voyages = new Map(
		(yield* reads.voyage
			.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
			.pipe(Effect.orDie)).map((row) => [row.id, row]),
	);
	const pieces = new Map(
		(yield* reads.piece
			.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
			.pipe(Effect.orDie)).map((row) => [row.id, row]),
	);
	const sessions = new Map(
		(yield* reads.session
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie)).map((row) => [String(row.id), row]),
	);
	const links = Map.groupBy(
		yield* reads.pieceChange
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
			.pipe(Effect.orDie),
		(row) => row.changeId,
	);
	const current = yield* reads.quayChange
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: quayChangeSelection })
		.pipe(Effect.orDie);
	const candidates = (yield* reads.change
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie)).filter((row) => !dismissed.has(row.id));
	const desired = candidates
		.map((held) => {
			const origin = held.originSessionId === null ? undefined : sessions.get(held.originSessionId);
			return {
				...held,
				originSessionId:
					origin !== undefined && origin.parentSessionId === null && origin.agentId === held.openedByAgentId ? held.originSessionId : null,
				repoName: repositories.get(held.repoId)?.name ?? held.repoId,
				group: group(held),
				pieces: (links.get(held.id) ?? []).flatMap((link) => {
					const work = pieces.get(link.pieceId);
					const sailing = work === undefined ? undefined : voyages.get(work.voyageId);
					return work === undefined || sailing === undefined
						? []
						: [{ id: work.id, title: work.title, voyageId: sailing.id, voyageName: sailing.name }];
				}),
			};
		})
		.filter((row) => row.pieces.length > 0);
	const wanted = new Map(desired.map((row) => [row.id, row]));
	for (const row of current) if (!wanted.has(row.id)) yield* writes.quayChange.delete(row.id).pipe(Effect.orDie);
	for (const row of desired) {
		const previous = current.find((held) => held.id === row.id);
		if (previous === undefined) yield* writes.quayChange.insertVoid(row).pipe(Effect.orDie);
		else if (JSON.stringify(previous) !== JSON.stringify(row)) yield* writes.quayChange.updateVoid({ ...row, id: row.id }).pipe(Effect.orDie);
	}
});
