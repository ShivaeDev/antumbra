import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { artifactFiles } from "@antumbra/server/adapters/artifacts/layer.ts";
import { ArtifactStorage } from "@antumbra/server/adapters/artifacts/storage.ts";
import { InputStorage } from "@antumbra/server-inputs/storage.ts";
import { rebuild } from "@antumbra/server-journal/postgres/rebuild.ts";
import { holdWrite } from "@antumbra/server-journal/test-support/execution-concurrency.ts";
import { validateFixtureFacts } from "@antumbra/server-journal/testing/fixture-facts.ts";
import { CommittedSink, transact } from "@shivaedev/sql/transact.ts";
import { Data, Effect, FileSystem, Layer, Ref } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { definition } from "#app.ts";
import { createGitHubFixture } from "#github.ts";
import { postgresApplication } from "#postgres-application.ts";
import { postgresClients } from "#postgres-clients.ts";
import { executionProof } from "#test-support/execution-proof.ts";
import { recordGitHubObservations } from "#test-support/github-observations.ts";
import { legacyInputSession } from "#test-support/input-fixture.ts";
import { journalComparison } from "#test-support/journal-comparison.ts";
import { observeJournal } from "#test-support/journal-evidence.ts";
import { replayJournal } from "#test-support/journal-replay.ts";
import { observeMailJournal } from "#test-support/mail-evidence.ts";
import { reconciliation } from "#test-support/reconciliation.ts";
import { scriptedTranscriptLog } from "#test-support/transcript-log.ts";

class Rejected extends Data.TaggedError("VoyageStoryRejected") {}
export const create = Effect.fn("PostgresApp.create")(function* () {
	const published = yield* Ref.make<readonly unknown[]>([]);
	const committed = yield* CommittedSink;
	const reactivity = yield* Reactivity;
	const sqlObservation = Layer.succeed(CommittedSink, (keys) =>
		Ref.update(published, (current) => [...current, ...keys]).pipe(
			Effect.andThen(committed === undefined ? reactivity.invalidate(keys) : committed(keys)),
		),
	);
	const storage = Layer.effect(
		ArtifactStorage,
		Effect.gen(function* () {
			return { root: yield* (yield* FileSystem.FileSystem).makeTempDirectoryScoped() };
		}),
	);
	const inputStorage = Layer.effect(
		InputStorage,
		Effect.gen(function* () {
			return { root: yield* (yield* FileSystem.FileSystem).makeTempDirectoryScoped() };
		}),
	);
	const inputDelivery = Layer.succeed(InputDelivery, { admit: () => Effect.void, deliver: () => Effect.succeed("accepted" as const) });
	const { layer: transcriptLogLayer, ...transcriptLog } = yield* scriptedTranscriptLog();
	const application = postgresApplication.pipe(
		Layer.provideMerge(transcriptLogLayer),
		Layer.provideMerge(Layer.mergeAll(inputStorage, inputDelivery)),
		Layer.provideMerge(artifactFiles.pipe(Layer.provide(storage))),
		Layer.provideMerge(sqlObservation),
	);
	const services = yield* Layer.build(application);
	const clients = yield* postgresClients().pipe(Effect.provideContext(services));
	const reconciling = yield* reconciliation().pipe(Effect.provideContext(services));
	const execution = yield* executionProof().pipe(Effect.provideContext(services));
	return {
		...execution,
		reconciliation: {
			...reconciling,
			start: reconciling.start.pipe(Effect.provideContext(services)),
			claim: reconciling.claim.pipe(Effect.provideContext(services)),
		},
		...transcriptLog,
		appendRunner: (logId: Parameters<typeof execution.appendRunner>[0], entries: Parameters<typeof execution.appendRunner>[1]) =>
			execution.appendRunner(logId, entries).pipe(Effect.provideContext(services)),
		...clients,
		holdWrite: <A, E, R>(effect: Effect.Effect<A, E, R>) => holdWrite(effect).pipe(Effect.provideContext(services)),
		validateFixtureFacts: (facts: Parameters<typeof validateFixtureFacts>[1]) => validateFixtureFacts(definition, facts),

		observeMailJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>, requestId: Parameters<typeof observeMailJournal>[1]) =>
			observeMailJournal(journal, requestId).pipe(Effect.provideContext(services)),
		rebuild: () => rebuild().pipe(Effect.provideContext(services)),
		transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
			transact(effect, { onSqlError: (error) => error }).pipe(Effect.provideContext(services)),
		journal: journalComparison,
		github: createGitHubFixture,
		recordGitHub: (requestId: string, observations: Parameters<typeof recordGitHubObservations>[1]) =>
			recordGitHubObservations(requestId, observations).pipe(Effect.provideContext(services)),
		legacyInputSession,
		replayJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>) => replayJournal(journal).pipe(Effect.provideContext(services)),
		observeJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>, requestId: Parameters<typeof observeJournal>[1]) =>
			observeJournal(journal, requestId).pipe(Effect.provideContext(services)),
		published: () => Ref.get(published),
		clearPublished: () => Ref.set(published, []),
		rollback: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
			transact(effect.pipe(Effect.andThen(Effect.fail(new Rejected()))), { onSqlError: (error) => error }).pipe(
				Effect.catchTag("VoyageStoryRejected", () => Effect.void),
				Effect.provideContext(services),
			),
	};
});
