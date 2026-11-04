import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { artifactFiles } from "@antumbra/server/adapters/artifacts/layer.ts";
import { ArtifactStorage } from "@antumbra/server/adapters/artifacts/storage.ts";
import { ArtifactsContract } from "@antumbra/server-artifacts/contract.ts";
import { BackendsContract } from "@antumbra/server-backends/contract.ts";
import { BoardsContract } from "@antumbra/server-boards/contract.ts";
import { ChangesContract } from "@antumbra/server-changes/contract.ts";
import { InputsContract } from "@antumbra/server-inputs/contract.ts";
import { InputStorage } from "@antumbra/server-inputs/storage.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { rebuild } from "@antumbra/server-journal/postgres/rebuild.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { validateFixtureFacts } from "@antumbra/server-journal/testing/fixture-facts.ts";
import { MailContract } from "@antumbra/server-mail/contract.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { PiecesContract } from "@antumbra/server-pieces/contract.ts";
import { ReportsContract } from "@antumbra/server-reports/contract.ts";
import { ReposContract } from "@antumbra/server-repos/contract.ts";
import { RoleSettingsContract } from "@antumbra/server-role-settings/contract.ts";
import { SettingsContract } from "@antumbra/server-settings/contract.ts";
import { VoyagesContract } from "@antumbra/server-voyages/contract.ts";
import { CommittedSink, transact } from "@shivaedev/sql/transact.ts";
import { Data, Effect, FileSystem, Layer, Ref } from "effect";
import { RpcTest } from "effect/rpc";
import { definition } from "#app.ts";
import { createGitHubFixture } from "#github.ts";
import { postgresApplication } from "#postgres-application.ts";
import { recordGitHubObservations } from "#test-support/github-observations.ts";
import { legacyInputSession } from "#test-support/input-fixture.ts";
import { journalComparison } from "#test-support/journal-comparison.ts";
import { observeJournal } from "#test-support/journal-evidence.ts";
import { replayJournal } from "#test-support/journal-replay.ts";
import { observeMailJournal } from "#test-support/mail-evidence.ts";

class Rejected extends Data.TaggedError("VoyageStoryRejected") {}
export const create = Effect.fn("PostgresApp.create")(function* () {
	const published = yield* Ref.make<readonly unknown[]>([]);
	const sqlObservation = Layer.succeed(CommittedSink, (keys) => Ref.update(published, (current) => [...current, ...keys]));
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
	const application = postgresApplication.pipe(
		Layer.provideMerge(Layer.mergeAll(inputStorage, inputDelivery)),
		Layer.provideMerge(artifactFiles.pipe(Layer.provide(storage))),
		Layer.provideMerge(sqlObservation),
	);
	const services = yield* Layer.build(application);
	const api = yield* RpcTest.makeClient(VoyagesContract.application).pipe(Effect.provideContext(services));
	const history = yield* VoyageHistory.pipe(Effect.provideContext(services));
	const pieceApi = yield* RpcTest.makeClient(PiecesContract.application).pipe(Effect.provideContext(services));
	const mailApi = yield* RpcTest.makeClient(MailContract.application).pipe(Effect.provideContext(services));
	const mailHistory = yield* MailHistory.pipe(Effect.provideContext(services));
	const mailService = yield* Mail.pipe(Effect.provideContext(services));
	const pieceHistory = yield* PieceHistory.pipe(Effect.provideContext(services));
	const settingsApi = yield* RpcTest.makeClient(SettingsContract.application).pipe(Effect.provideContext(services));
	const settingsHistory = yield* SettingsHistory.pipe(Effect.provideContext(services));
	const backendsApi = yield* RpcTest.makeClient(BackendsContract.application).pipe(Effect.provideContext(services));
	const backendsHistory = yield* BackendsHistory.pipe(Effect.provideContext(services));
	const roleSettingsApi = yield* RpcTest.makeClient(RoleSettingsContract.application).pipe(Effect.provideContext(services));
	const roleSettingsHistory = yield* RoleSettingsHistory.pipe(Effect.provideContext(services));
	const boardsApi = yield* RpcTest.makeClient(BoardsContract.application).pipe(Effect.provideContext(services));
	const boardsHistory = yield* BoardsHistory.pipe(Effect.provideContext(services));
	const reposApi = yield* RpcTest.makeClient(ReposContract.application).pipe(Effect.provideContext(services));
	const reposHistory = yield* ReposHistory.pipe(Effect.provideContext(services));
	const artifactsApi = yield* RpcTest.makeClient(ArtifactsContract.application).pipe(Effect.provideContext(services));
	const artifactsHistory = yield* ArtifactsHistory.pipe(Effect.provideContext(services));
	const reportsApi = yield* RpcTest.makeClient(ReportsContract.application).pipe(Effect.provideContext(services));
	const reportsHistory = yield* ReportsHistory.pipe(Effect.provideContext(services));
	const inputsApi = yield* RpcTest.makeClient(InputsContract.application).pipe(Effect.provideContext(services));
	const inputsHistory = yield* InputsHistory.pipe(Effect.provideContext(services));
	const changesApi = yield* RpcTest.makeClient(ChangesContract.application).pipe(Effect.provideContext(services));
	const changesHistory = yield* ChangesHistory.pipe(Effect.provideContext(services));
	return {
		validateFixtureFacts: (facts: Parameters<typeof validateFixtureFacts>[1]) => validateFixtureFacts(definition, facts),
		changesHistory,
		inputsHistory,
		reportsHistory,
		artifactsHistory,
		reposHistory,
		boardsHistory,
		roleSettingsHistory,
		settingsHistory,
		backendsHistory,
		api: {
			...changesApi,
			...inputsApi,
			...reposApi,
			...artifactsApi,
			...reportsApi,
			...boardsApi,
			...api,
			...pieceApi,
			...mailApi,
			...settingsApi,
			...roleSettingsApi,
			...backendsApi,
		},
		mailHistory,
		observeMail: mailService.observeWake,
		observeMailJournal: (journal: Effect.Success<ReturnType<typeof journalComparison>>, requestId: Parameters<typeof observeMailJournal>[1]) =>
			observeMailJournal(journal, requestId).pipe(Effect.provideContext(services)),
		rebuild: () => rebuild().pipe(Effect.provideContext(services)),
		pieceHistory,
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
