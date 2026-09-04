import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const forgetRepo = Effect.fn("Repos.forget")(function* (id: string) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
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
	yield* feeds.publishFleetRefresh();
	yield* feeds.publishVoyageRefresh();
});
