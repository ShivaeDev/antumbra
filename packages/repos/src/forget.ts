import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

const deleteRepoGraph = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const changes = yield* db.Change.where({ repoId: id }).all();
		yield* Effect.forEach(
			changes,
			(change) =>
				db.ChangeTransition.where({ changeId: change.id })
					.deleteAll()
					.pipe(Effect.andThen(db.PieceChange.where({ changeId: change.id }).deleteAll())),
			{ discard: true },
		);
		yield* db.Change.where({ repoId: id }).deleteAll();
		yield* db.Repo.where({ id }).deleteAll();
	});

export const forgetRepo = (id: string) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		yield* deleteRepoGraph(id);
		yield* feeds.publishFleetRefresh();
		yield* feeds.publishVoyageRefresh();
	});
