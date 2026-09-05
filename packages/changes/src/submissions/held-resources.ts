import { Database } from "@antumbra/persistence";
import type { HeldResource } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { dismissedChangeIdsFor } from "#change-verdicts.ts";
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
	const matchingIds = new Set(matchingChanges.map(({ id }) => id));
	const matchingLinks = yield* Effect.forEach(yield* db.PieceChange.where((link) => link.changeId.in([...matchingIds])).all(), pieceChangeRow);
	const pieceIds = [...new Set(matchingLinks.map(({ pieceId }) => pieceId))];
	const links = yield* Effect.forEach(yield* db.PieceChange.where((link) => link.pieceId.in(pieceIds)).all(), pieceChangeRow);
	const relatedIds = [...new Set(links.map(({ changeId }) => changeId))].filter((id) => !matchingIds.has(id));
	const related = yield* Effect.forEach(yield* db.Change.where((change) => change.id.in(relatedIds)).all(), changeRow);
	const changes = [...matchingChanges, ...related];
	return heldBerths({
		berths: [resource],
		changes,
		dismissedChangeIds: yield* dismissedChangeIdsFor(changes.map(({ id }) => id)),
		pieceChanges: links,
		repos: [repo.value],
	});
});

export const readHeldResources = Effect.fn("Changes.heldResources")(function* (resources: ReadonlyArray<HeldResource>) {
	const held = yield* Effect.forEach(resources, heldResource);
	return new Map(held.flatMap((entries) => [...entries]));
});
