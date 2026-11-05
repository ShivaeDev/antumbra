import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as changeAdoptionRequestSelection } from "@antumbra/server-storage/records/change-adoption-request.ts";
import { selection as changeFeedbackSelection } from "@antumbra/server-storage/records/change-feedback.ts";
import { selection as changeTransitionSelection } from "@antumbra/server-storage/records/change-transition.ts";
import { selection as changeVerdictSelection } from "@antumbra/server-storage/records/change-verdict.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

const forgetAdoptions = Effect.fn("changes.forgetAdoptions")(function* (repositories: ReadonlySet<string>) {
	const reads = yield* Records;
	const writes = yield* Records;

	for (const request of yield* reads.changeAdoptionRequest
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeAdoptionRequestSelection })
		.pipe(Effect.orDie))
		if (!repositories.has(request.repoId)) yield* writes.changeAdoptionRequest.delete(request.id).pipe(Effect.orDie);
});

const forgetChanges = Effect.fn("changes.forgetChanges")(function* (repositories: ReadonlySet<string>) {
	const reads = yield* Records;
	const writes = yield* Records;

	const removed = new Set(
		(yield* reads.change.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection }).pipe(Effect.orDie))
			.filter((row) => !repositories.has(row.repoId))
			.map((row) => row.id),
	);
	for (const id of removed) yield* writes.change.delete(id).pipe(Effect.orDie);
	for (const row of yield* reads.pieceChange
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
		.pipe(Effect.orDie))
		if (removed.has(row.changeId)) yield* writes.pieceChange.delete(row.id).pipe(Effect.orDie);
	for (const row of yield* reads.changeTransition
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeTransitionSelection })
		.pipe(Effect.orDie))
		if (removed.has(row.changeId)) yield* writes.changeTransition.delete(row.id).pipe(Effect.orDie);
	for (const row of yield* reads.changeVerdict
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeVerdictSelection })
		.pipe(Effect.orDie))
		if (removed.has(row.changeId)) yield* writes.changeVerdict.delete(row.changeId).pipe(Effect.orDie);
	for (const row of yield* reads.changeFeedback
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
		.pipe(Effect.orDie))
		if (removed.has(row.changeId)) yield* writes.changeFeedback.delete(row.id).pipe(Effect.orDie);
});

export const repositoryCleanup = Effect.fn("changes.repositoryCleanup")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;

	const repositories = new Set(
		(yield* reads.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie)).map(
			(row) => row.id,
		),
	);
	yield* forgetAdoptions(repositories);
	yield* forgetChanges(repositories);
});
