import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { change } from "#rows/change.ts";
import { pieceChange } from "#rows/piece-change.ts";
import { pieceChangeView } from "#rows/piece-change-view.ts";
export const pieceChangesProjection = projection("pieceChanges", {
	reads: [change, pieceChange, repo, pieceChangeView],
	writes: [pieceChangeView],
	run: Effect.fn("changes.pieceChangesProjection")(function* (reads, writes) {
		const changes = new Map((yield* reads.change.where({})).map((row) => [row.id, row]));
		const repos = new Map((yield* reads.repo.where({})).map((row) => [row.id, row]));
		const desired = (yield* reads.pieceChange.where({})).flatMap((link) => {
			const held = changes.get(link.changeId);
			return held === undefined ? [] : [{ ...held, rowId: link.id, pieceId: link.pieceId, repoName: repos.get(held.repoId)?.name ?? held.repoId }];
		});
		const current = new Map((yield* reads.pieceChangeView.where({})).map((row) => [row.rowId, row]));
		const wanted = new Set(desired.map((row) => row.rowId));
		for (const row of current.values()) if (!wanted.has(row.rowId)) yield* writes.pieceChangeView.delete(row.rowId);
		for (const row of desired) {
			const before = current.get(row.rowId);
			if (before === undefined) yield* writes.pieceChangeView.insert(row);
			else if (JSON.stringify(before) !== JSON.stringify(row)) yield* writes.pieceChangeView.update(row.rowId, row);
		}
	}),
});
