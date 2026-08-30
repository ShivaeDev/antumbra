import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

const deleteRepoGraph = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const changes = yield* db.Change.where({ repoId: id }).all();
		yield* Effect.forEach(changes, (change) =>
			db.ChangeTransition.where({ changeId: change.id })
				.deleteAll()
				.pipe(Effect.andThen(db.PieceChange.where({ changeId: change.id }).deleteAll())),
		);
		yield* db.Change.where({ repoId: id }).deleteAll();
		yield* db.Repo.where({ id }).deleteAll();
	});

// why: forgetting is the destructive boundary for a registered repo. Its
// changes cannot survive without the registry identity that lets the watcher
// address them, so links and transition history leave in the same transaction.
export const forgetRepo = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		yield* db.transaction(deleteRepoGraph(id));
		yield* Effect.all([feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()]);
	});
