import { Effect } from "effect";
import { journalArtifacts, replayArtifactsFixture } from "#replay/artifacts.ts";
import { journalBackends, replayBackendsFixture } from "#replay/backends.ts";
import { journalBoards, replayBoardsFixture } from "#replay/boards.ts";
import { checkChanges, replayChangesFixture } from "#replay/changes.ts";
import { journalChanges } from "#replay/changes-read.ts";
import { journalExecution, replayExecutionFixture } from "#replay/execution.ts";
import { journalInputs, replayInputsFixture } from "#replay/inputs.ts";
import { journalMail, replayMailFixture } from "#replay/mail.ts";
import { checkPieces, journalPieces, replayPieceFixture } from "#replay/pieces.ts";
import { journalReports, replayReportsFixture } from "#replay/reports.ts";
import { journalRepos, replayReposFixture } from "#replay/repos.ts";
import { journalRoleSettings, replayRoleSettingsFixture } from "#replay/role-settings.ts";
import { journalSettings, replaySettingsFixture } from "#replay/settings.ts";
import { journalVoyages, replayVoyageFixture } from "#replay/voyages.ts";

export const replayPostgresFixture = Effect.fn("Postgres.replayFixture")(function* (filename: string) {
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
		yield* checkPieces(pieces);
		yield* checkChanges(changes);
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
	});
});
