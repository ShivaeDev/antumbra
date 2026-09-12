import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { type ChangeRow, change } from "#rows/change.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
import { pieceChange } from "#rows/piece-change.ts";
import { quayChange } from "#rows/quay-change.ts";

const group = (held: ChangeRow): typeof quayChange.Row.Type.group => {
	if (held.stage === "withdrawn") return "needsAttention";
	if (held.draftAt !== null) return "draft";
	if (held.checks === "red" || held.review === "changes_requested" || held.mergeable === "conflict") return "needsAttention";
	return held.mergeable === "clean" && held.checks !== "pending" ? "alongside" : "checksRunning";
};
export const quayProjection = projection("changeQuay", {
	reads: [change, pieceChange, changeVerdict, repo, piece, voyage, session, quayChange],
	writes: [quayChange],
	run: Effect.fn("changes.quayProjection")(function* (reads, writes) {
		const dismissed = new Set((yield* reads.changeVerdict.where({})).map((row) => row.changeId));
		const repositories = new Map((yield* reads.repo.where({})).map((row) => [row.id, row]));
		const voyages = new Map((yield* reads.voyage.where({})).map((row) => [row.id, row]));
		const pieces = new Map((yield* reads.piece.where({})).map((row) => [row.id, row]));
		const sessions = new Map((yield* reads.session.where({})).map((row) => [String(row.id), row]));
		const links = Map.groupBy(yield* reads.pieceChange.where({}), (row) => row.changeId);
		const current = yield* reads.quayChange.where({});
		const candidates = (yield* reads.change.where({})).filter((row) => row.stage !== "landed" && !dismissed.has(row.id));
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
		for (const row of current) if (!wanted.has(row.id)) yield* writes.quayChange.delete(row.id);
		for (const row of desired) {
			const previous = current.find((held) => held.id === row.id);
			if (previous === undefined) yield* writes.quayChange.insert(row);
			else if (JSON.stringify(previous) !== JSON.stringify(row)) yield* writes.quayChange.update(row.id, row);
		}
	}),
});
