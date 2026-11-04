import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import { journalArtifacts, replayArtifactsFixture } from "@antumbra/server-journal/postgres/artifacts/fixture.ts";
import { journalBackends, replayBackendsFixture } from "@antumbra/server-journal/postgres/backends/fixture.ts";
import { journalBoards, replayBoardsFixture } from "@antumbra/server-journal/postgres/boards/fixture.ts";
import { journalChanges, replayChangesFixture } from "@antumbra/server-journal/postgres/changes/fixture.ts";
import { journalExecution, replayExecutionFixture } from "@antumbra/server-journal/postgres/execution/fixture.ts";
import { journalInputs, replayInputsFixture } from "@antumbra/server-journal/postgres/inputs/fixture.ts";
import { journalMail, replayMailFixture } from "@antumbra/server-journal/postgres/mail/fixture.ts";
import { journalPieces, replayPieceFixture } from "@antumbra/server-journal/postgres/pieces/fixture.ts";
import { journalReports, replayReportsFixture } from "@antumbra/server-journal/postgres/reports/fixture.ts";
import { journalRepos, replayReposFixture } from "@antumbra/server-journal/postgres/repos/fixture.ts";
import { journalRoleSettings, replayRoleSettingsFixture } from "@antumbra/server-journal/postgres/role-settings/fixture.ts";
import { journalSettings, replaySettingsFixture } from "@antumbra/server-journal/postgres/settings/fixture.ts";
import { journalVoyages, replayVoyageFixture } from "@antumbra/server-journal/postgres/voyages/fixture.ts";
import { Effect, FileSystem, Path } from "effect";
import type { journalComparison } from "#test-support/journal-comparison.ts";

export const captureJournal = Effect.fn("PostgresApp.captureJournal")(function* (journal: Effect.Success<ReturnType<typeof journalComparison>>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const filename = path.join(yield* fs.makeTempDirectoryScoped(), "journal.db");
	yield* journal.snapshot(filename);
	return filename;
});

export const replayJournal = Effect.fn("PostgresApp.replayJournal")(function* (journal: Effect.Success<ReturnType<typeof journalComparison>>) {
	const filename = yield* captureJournal(journal);
	const snapshot = yield* journalVoyages(filename);
	yield* replayVoyageFixture(snapshot);
	const pieces = yield* journalPieces(filename);
	yield* replayPieceFixture(pieces);
	const mail = yield* journalMail(filename);
	yield* replayMailFixture(mail);
	yield* replaySettingsFixture(yield* journalSettings(filename));
	yield* replayBackendsFixture(yield* journalBackends(filename));
	yield* replayRoleSettingsFixture(yield* journalRoleSettings(filename));
	yield* replayBoardsFixture(yield* journalBoards(filename));
	yield* replayReposFixture(yield* journalRepos(filename));
	const artifacts = yield* journalArtifacts(filename);
	yield* replayArtifactsFixture(artifacts);
	const files = yield* ArtifactFiles;
	for (const artifact of artifacts.artifact) {
		const content = yield* journal.artifact.read(artifact.id);
		yield* files.publish({ basename: artifact.basename, bytes: new TextEncoder().encode(content.markdown) });
	}
	yield* replayReportsFixture(yield* journalReports(filename));
	yield* replayChangesFixture(yield* journalChanges(filename));
	const executionSnapshot = yield* journalExecution(filename);
	yield* replayExecutionFixture(executionSnapshot);
	yield* replayInputsFixture(yield* journalInputs(filename));
	return { executionSnapshot, ...snapshot, pieceSnapshot: pieces, mailSnapshot: mail };
});
