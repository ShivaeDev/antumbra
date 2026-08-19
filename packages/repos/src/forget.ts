import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import { type Context, Effect, PubSub } from "effect";

const deleteRepoGraph = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const changes = yield* db.Change.where({ repoId: id }).all();
		yield* Effect.forEach(changes, (change) =>
			db.ChangeTransition.where({ changeId: change.id })
				.deleteAll()
				.pipe(
					Effect.andThen(
						db.PieceChange.where({ changeId: change.id }).deleteAll(),
					),
				),
		);
		yield* db.Change.where({ repoId: id }).deleteAll();
		yield* db.Repo.where({ id }).deleteAll();
	});

// why: forgetting is the destructive boundary for a registered repo. Its
// changes cannot survive without the registry identity that lets the watcher
// address them, so links and transition history leave in the same transaction.

export const forgetRepo = Effect.fn("repos.forgetRepo")(function* (
	id: string,
): Effect.fn.Return<
	void,
	PrismaError,
	| Context.Service.Identifier<typeof Database>
	| Context.Service.Identifier<typeof DomainFeeds>
	| Context.Service.Identifier<typeof Writer>
	| WriteExecutors
> {
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	yield* writer.write(deleteRepoGraph(id));
	yield* Effect.all([
		PubSub.publish(feeds.fleet, undefined),
		PubSub.publish(feeds.voyages, undefined),
	]);
});
