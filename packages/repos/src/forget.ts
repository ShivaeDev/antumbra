import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const forgetRepo = Effect.fn("Repos.forget")(function* (id: string) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const changeIds = (yield* db.Change.where({ repoId: id }).all()).map((change) => change.id);
	yield* db.ChangeTransition.where((transition) => transition.changeId.in(changeIds)).deleteAll();
	yield* db.PieceChange.where((link) => link.changeId.in(changeIds)).deleteAll();
	yield* db.Change.where({ repoId: id }).deleteAll();
	yield* db.Repo.where({ id }).deleteAll();
	yield* feeds.publishFleetRefresh();
	yield* feeds.publishVoyageRefresh();
});
