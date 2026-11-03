import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { rebuild } from "@antumbra/server-journal/postgres/rebuild.ts";
import { postgresTests } from "@antumbra/server-journal/postgres/testing.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { MailContract } from "@antumbra/server-mail/contract.ts";
import { mail } from "@antumbra/server-mail/handlers.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { PiecesContract } from "@antumbra/server-pieces/contract.ts";
import { pieces } from "@antumbra/server-pieces/handlers.ts";
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
import { observeJournal } from "#test-support/journal-evidence.ts";
import { replayJournal } from "#test-support/journal-replay.ts";
import { observeMailJournal } from "#test-support/mail-evidence.ts";

class Rejected extends Data.TaggedError("VoyageStoryRejected") {}

export const postgresApplication = Layer.mergeAll(voyages, pieces, mail).pipe(
	Layer.provideMerge(Layer.mergeAll(VoyageHistory.layer, PieceHistory.layer, MailHistory.layer)),
);

const create = Effect.fn("PostgresApp.create")(function* () {
	const published = yield* Ref.make<readonly unknown[]>([]);
	const sqlObservation = Layer.succeed(CommittedSink, (keys) => Ref.update(published, (current) => [...current, ...keys]));
	const application = postgresApplication.pipe(Layer.provideMerge(sqlObservation));
	const services = yield* Layer.build(application);
	const api = yield* RpcTest.makeClient(VoyagesContract.application).pipe(Effect.provideContext(services));
	const history = yield* VoyageHistory.pipe(Effect.provideContext(services));
	const pieceApi = yield* RpcTest.makeClient(PiecesContract.application).pipe(Effect.provideContext(services));
	const mailApi = yield* RpcTest.makeClient(MailContract.application).pipe(Effect.provideContext(services));
	const mailHistory = yield* MailHistory.pipe(Effect.provideContext(services));
	const mailService = yield* Mail.pipe(Effect.provideContext(services));
	const pieceHistory = yield* PieceHistory.pipe(Effect.provideContext(services));
	return {
		api: { ...api, ...pieceApi, ...mailApi },
		mailHistory,
		observeMail: mailService.observeWake,
		observeMailJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>, requestId: Parameters<typeof observeMailJournal>[1]) =>
			observeMailJournal(journal, requestId).pipe(Effect.provideContext(services)),
		rebuild: () => rebuild().pipe(Effect.provideContext(services)),
		pieceHistory,
		transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
			transact(effect, { onSqlError: (error) => error }).pipe(Effect.provideContext(services)),
		journal: journalComparison,
		replayJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>) => replayJournal(journal).pipe(Effect.provideContext(services)),
		observeJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>, requestId: Parameters<typeof observeJournal>[1]) =>
			observeJournal(journal, requestId).pipe(Effect.provideContext(services)),
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
