import { Database } from "@antumbra/persistence";
import type { HeldResource } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { readDismissedChangeIds } from "#change-verdicts.ts";
import { heldBerths } from "#held-berths.ts";

const heldResource = Effect.fnUntraced(function* (resource: HeldResource) {
	const db = yield* Database;
	const repo = yield* db.Repo.where({ source: resource.source }).first();
	if (Option.isNone(repo)) {
		return new Map<string, string>();
	}
	const matchingChanges = yield* Effect.forEach(
		yield* db.Change.where({
			headRef: resource.branch,
			repoId: repo.value.id,
		}).all(),
		changeRow,
	);
	const matchingLinks = yield* Effect.forEach(matchingChanges, (change) =>
		db.PieceChange.where({ changeId: change.id })
			.all()
			.pipe(Effect.flatMap((rows) => Effect.forEach(rows, pieceChangeRow))),
	);
	const pieceIds = new Set(matchingLinks.flat().map(({ pieceId }) => pieceId));
	const pieceLinks = yield* Effect.forEach(pieceIds, (pieceId) =>
		db.PieceChange.where({ pieceId })
			.all()
			.pipe(Effect.flatMap((rows) => Effect.forEach(rows, pieceChangeRow))),
	);
	const links = pieceLinks.flat();
	const changeIds = new Set([...matchingChanges.map(({ id }) => id), ...links.map(({ changeId }) => changeId)]);
	const related = yield* Effect.forEach(changeIds, (id) => db.Change.where({ id }).first());
	const changes = yield* Effect.forEach(
		related.flatMap((change) => (Option.isSome(change) ? [change.value] : [])),
		changeRow,
	);
	return heldBerths({
		berths: [resource],
		changes,
		dismissedChangeIds: yield* readDismissedChangeIds,
		pieceChanges: links,
		repos: [repo.value],
	});
});

export const readHeldResources = Effect.fn("Changes.heldResources")(function* (resources: ReadonlyArray<HeldResource>) {
	const held = yield* Effect.forEach(resources, heldResource);
	return new Map(held.flatMap((entries) => [...entries]));
});
