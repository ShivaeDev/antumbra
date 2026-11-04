import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { Effect, Layer } from "effect";
import { layer as reactivityLayer } from "effect/reactivity/Reactivity";
import { journalArtifacts, replayArtifactsFixture } from "#postgres/artifacts/fixture.ts";
import { ArtifactsHistory } from "#postgres/artifacts/service.ts";
import { journalBackends, replayBackendsFixture } from "#postgres/backends/fixture.ts";
import { BackendsHistory } from "#postgres/backends/service.ts";
import { journalBoards, replayBoardsFixture } from "#postgres/boards/fixture.ts";
import { BoardsHistory } from "#postgres/boards/service.ts";
import { journalChanges, replayChangesFixture } from "#postgres/changes/fixture.ts";
import { ChangesHistory } from "#postgres/changes/service.ts";
import { journalExecution, replayExecutionFixture } from "#postgres/execution/fixture.ts";
import { ExecutionHistory } from "#postgres/execution/service.ts";
import { journalInputs, replayInputsFixture } from "#postgres/inputs/fixture.ts";
import { InputsHistory } from "#postgres/inputs/service.ts";
import { journalMail, replayMailFixture } from "#postgres/mail/fixture.ts";
import { MailHistory } from "#postgres/mail/service.ts";
import { journalPieces, replayPieceFixture } from "#postgres/pieces/fixture.ts";
import { PieceHistory } from "#postgres/pieces/service.ts";
import { journalReports, replayReportsFixture } from "#postgres/reports/fixture.ts";
import { ReportsHistory } from "#postgres/reports/service.ts";
import { journalRepos, replayReposFixture } from "#postgres/repos/fixture.ts";
import { ReposHistory } from "#postgres/repos/service.ts";
import { journalRoleSettings, replayRoleSettingsFixture } from "#postgres/role-settings/fixture.ts";
import { RoleSettingsHistory } from "#postgres/role-settings/service.ts";
import { journalSettings, replaySettingsFixture } from "#postgres/settings/fixture.ts";
import { SettingsHistory } from "#postgres/settings/service.ts";
import { postgresTests } from "#postgres/testing.ts";
import { journalVoyages, replayVoyageFixture } from "#postgres/voyages/fixture.ts";
import { VoyageHistory } from "#postgres/voyages/service.ts";

export const checkPostgresFixture = Effect.fn("Postgres.checkFixture")(
	function* (filename: string) {
		const execution = yield* journalExecution(filename);
		const settings = yield* journalSettings(filename);
		const backends = yield* journalBackends(filename);
		const rolesettings = yield* journalRoleSettings(filename);
		const mail = yield* journalMail(filename);
		const snapshot = yield* journalVoyages(filename);
		const boards = yield* journalBoards(filename);
		const repos = yield* journalRepos(filename);
		const artifacts = yield* journalArtifacts(filename);
		const reports = yield* journalReports(filename);
		const inputs = yield* journalInputs(filename);
		const changes = yield* journalChanges(filename);
		const pieces = yield* journalPieces(filename);
		return yield* Effect.gen(function* () {
			const voyages = yield* replayVoyageFixture(snapshot);
			const reposResult = yield* replayReposFixture(repos);
			const settingsResult = yield* replaySettingsFixture(settings);
			const backendsResult = yield* replayBackendsFixture(backends);
			const rolesettingsResult = yield* replayRoleSettingsFixture(rolesettings);
			const replayed = yield* replayPieceFixture(pieces);
			const mailed = yield* replayMailFixture(mail);
			const changesResult = yield* replayChangesFixture(changes);
			const reportsResult = yield* replayReportsFixture(reports);
			const artifactsResult = yield* replayArtifactsFixture(artifacts);
			const boardsResult = yield* replayBoardsFixture(boards);
			const executionResult = yield* replayExecutionFixture(execution);
			const inputsResult = yield* replayInputsFixture(inputs);
			const results = [
				executionResult,
				voyages,
				replayed,
				mailed,
				settingsResult,
				backendsResult,
				rolesettingsResult,
				changesResult,
				inputsResult,
				reportsResult,
				artifactsResult,
				reposResult,
				boardsResult,
			];
			return {
				...executionResult,
				...voyages,
				...replayed,
				...mailed,
				...settingsResult,
				...backendsResult,
				...rolesettingsResult,
				...changesResult,
				...inputsResult,
				...reportsResult,
				...artifactsResult,
				...reposResult,
				...boardsResult,
				events: results.reduce((total, result) => total + result.events, 0),
			};
		}).pipe(
			Effect.provide(
				Layer.mergeAll(
					ExecutionHistory.layer,
					BackendsHistory.layer,
					RoleSettingsHistory.layer,
					SettingsHistory.layer,
					BoardsHistory.layer,
					ReposHistory.layer,
					ArtifactsHistory.layer,
					ReportsHistory.layer,
					InputsHistory.layer.pipe(Layer.provide(ExecutionHistory.layer)),
					ChangesHistory.layer,
					VoyageHistory.layer,
					PieceHistory.layer,
					MailHistory.layer,
				),
			),
			withIsolatedDatabase,
			Effect.provide(postgresTests),
		);
	},
	Effect.provide(reactivityLayer),
	Effect.scoped,
);
