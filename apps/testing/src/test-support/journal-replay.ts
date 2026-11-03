import { journalVoyages, replayVoyageFixture } from "@antumbra/server-journal/postgres/voyages/fixture.ts";
import { Effect, FileSystem, Path } from "effect";
import type { journalComparison } from "#test-support/journal-comparison.ts";

export const replayJournal = Effect.fn("PostgresApp.replayJournal")(function* (journal: Effect.Success<ReturnType<typeof journalComparison>>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const filename = path.join(yield* fs.makeTempDirectoryScoped(), "journal.db");
	yield* journal.snapshot(filename);
	const snapshot = yield* journalVoyages(filename);
	yield* replayVoyageFixture(snapshot);
	return snapshot;
});
