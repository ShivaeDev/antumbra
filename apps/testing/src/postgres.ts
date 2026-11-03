import { postgresTests } from "@antumbra/server-journal/postgres/testing.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { VoyagesContract } from "@antumbra/server-voyages/contract.ts";
import { voyages } from "@antumbra/server-voyages/handlers.ts";
import { NodeServices } from "@effect/platform-node";
import { CommittedSink, transact } from "@shivaedev/sql/transact.ts";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Clock, Data, Effect, Layer, Ref } from "effect";
import { RpcTest } from "effect/rpc";
import { TestClock } from "effect/testing";
import { journalComparison } from "#test-support/journal-comparison.ts";
import { replayJournal } from "#test-support/journal-replay.ts";

class Rejected extends Data.TaggedError("VoyageStoryRejected") {}

export const postgresApplication = voyages.pipe(Layer.provideMerge(VoyageHistory.layer));

const create = Effect.fn("PostgresApp.create")(function* () {
	const published = yield* Ref.make<readonly unknown[]>([]);
	const sqlObservation = Layer.succeed(CommittedSink, (keys) => Ref.update(published, (current) => [...current, ...keys]));
	const application = postgresApplication.pipe(Layer.provideMerge(sqlObservation));
	const services = yield* Layer.build(application);
	const api = yield* RpcTest.makeClient(VoyagesContract.application).pipe(Effect.provideContext(services));
	const history = yield* VoyageHistory.pipe(Effect.provideContext(services));
	return {
		api,
		journal: journalComparison,
		replayJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>) => replayJournal(journal).pipe(Effect.provideContext(services)),
		history,
		published: () => Ref.get(published),
		clearPublished: () => Ref.set(published, []),
		rollback: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
			transact(effect.pipe(Effect.andThen(Effect.fail(new Rejected()))), { onSqlError: (error) => error }).pipe(
				Effect.catchTag("VoyageStoryRejected", () => Effect.void),
				Effect.provideContext(services),
			),
	};
});

export const postgresApp = storyKit({
	name: "Antumbra PostgreSQL application",
	clock: "test",
	layer: postgresTests.pipe(Layer.provideMerge(NodeServices.layer)),
	stages: [],
	around: withIsolatedDatabase,
	create,
	verbs: (engine) => ({
		...engine,
		clock: { now: () => Clock.currentTimeMillis, advance: (millis: number) => TestClock.adjust(millis) },
	}),
	inspect: () => ({}),
});
