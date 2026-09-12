import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { Effect } from "effect";
import { present, removePresent } from "#journal/adapters/files.ts";
import { readJournal } from "#journal/adapters/store.ts";
import type { Command } from "#journal/command.ts";
import { desktopLockPath, journalFiles, journalPath } from "#journal/paths.ts";
import { reportLines } from "#journal/report.ts";

export interface Outcome {
	readonly lines: readonly string[];
	readonly refused: boolean;
}

const missing = (journal: string): Outcome => ({ lines: [`no dev journal at ${journal}`], refused: false });

const reset = (directory: string): Effect.Effect<Outcome, Error> =>
	Effect.gen(function* () {
		const lock = desktopLockPath(directory);
		if (yield* present(lock)) {
			return { lines: [`Antumbra appears to be running; quit the app, or remove ${lock} if it is stale, then try again`], refused: true };
		}
		const journal = journalPath(directory);
		const removed = yield* removePresent(journalFiles(journal));
		return removed.length === 0 ? missing(journal) : { lines: [`removed ${journal}`], refused: false };
	});

const facts = (directory: string, tail: number | undefined, features: readonly FeatureShape[]): Effect.Effect<Outcome, Error> =>
	Effect.gen(function* () {
		const journal = journalPath(directory);
		if (!(yield* present(journal))) return missing(journal);
		const reading = yield* readJournal(journal, tail ?? 0);
		return { lines: reportLines(features, reading, tail !== undefined), refused: false };
	});

export const run = (command: Command, directory: string, features: readonly FeatureShape[]): Effect.Effect<Outcome, Error> =>
	command.kind === "reset" ? reset(directory) : facts(directory, command.tail, features);
