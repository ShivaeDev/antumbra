import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import type { ReadHandles, WriteHandles } from "@antumbra/platform-feature/handles.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
import { change } from "#rows/change.ts";
import { changeFeedback } from "#rows/change-feedback.ts";
import { changeTransition } from "#rows/change-transition.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
import { pieceChange } from "#rows/piece-change.ts";

const sources = [adoptionRequest, repo, change, pieceChange, changeTransition, changeVerdict, changeFeedback] as const;
const targets = [adoptionRequest, change, pieceChange, changeTransition, changeVerdict, changeFeedback] as const;
type Reads = ReadHandles<typeof sources>;
type Writes = WriteHandles<typeof targets>;

const forgetAdoptions = Effect.fn("changes.forgetAdoptions")(function* (reads: Reads, writes: Writes, repositories: ReadonlySet<string>) {
	for (const request of yield* reads.changeAdoptionRequest.where({}))
		if (!repositories.has(request.repoId)) yield* writes.changeAdoptionRequest.delete(request.id);
});

const forgetChanges = Effect.fn("changes.forgetChanges")(function* (reads: Reads, writes: Writes, repositories: ReadonlySet<string>) {
	const removed = new Set((yield* reads.change.where({})).filter((row) => !repositories.has(row.repoId)).map((row) => row.id));
	for (const id of removed) yield* writes.change.delete(id);
	for (const row of yield* reads.pieceChange.where({})) if (removed.has(row.changeId)) yield* writes.pieceChange.delete(row.id);
	for (const row of yield* reads.changeTransition.where({})) if (removed.has(row.changeId)) yield* writes.changeTransition.delete(row.id);
	for (const row of yield* reads.changeVerdict.where({})) if (removed.has(row.changeId)) yield* writes.changeVerdict.delete(row.changeId);
	for (const row of yield* reads.changeFeedback.where({})) if (removed.has(row.changeId)) yield* writes.changeFeedback.delete(row.id);
});

export const repositoryCleanup = projection("changeRepositoryCleanup", {
	reads: sources,
	writes: targets,
	run: Effect.fn("changes.repositoryCleanup")(function* (reads, writes) {
		const repositories = new Set((yield* reads.repo.where({})).map((row) => row.id));
		yield* forgetAdoptions(reads, writes, repositories);
		yield* forgetChanges(reads, writes, repositories);
	}),
});
