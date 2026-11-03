import { journalMail, replayMailFixture } from "@antumbra/server-journal/postgres/mail/fixture.ts";
import { journalPieces, replayPieceFixture } from "@antumbra/server-journal/postgres/pieces/fixture.ts";
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
	return { ...snapshot, pieceSnapshot: pieces, mailSnapshot: mail };
});
