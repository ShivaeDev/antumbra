import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
import { pieceChange } from "#rows/piece-change.ts";
export const repositoryCleanup = projection("changeRepositoryCleanup", {
	reads: [repo, change, pieceChange, changeTransition, changeVerdict],
	writes: [change, pieceChange, changeTransition, changeVerdict],
	run: Effect.fn("changes.repositoryCleanup")(function* (reads, writes) {
		const repositories = new Set((yield* reads.repo.where({})).map((row) => row.id));
		const removed = new Set((yield* reads.change.where({})).filter((row) => !repositories.has(row.repoId)).map((row) => row.id));
		for (const id of removed) yield* writes.change.delete(id);
		for (const row of yield* reads.pieceChange.where({})) if (removed.has(row.changeId)) yield* writes.pieceChange.delete(row.id);
		for (const row of yield* reads.changeTransition.where({})) if (removed.has(row.changeId)) yield* writes.changeTransition.delete(row.id);
		for (const row of yield* reads.changeVerdict.where({})) if (removed.has(row.changeId)) yield* writes.changeVerdict.delete(row.changeId);
	}),
});
