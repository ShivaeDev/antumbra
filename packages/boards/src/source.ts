import { Effect, Option } from "effect";
import { entryRegister, entryRow, storedEntryVariant } from "#entries.ts";
import { BoardSourceConflict, type StoredBoardEntryInvalid } from "#errors.ts";
import type { BoardEntryRow, EntryInput } from "#model.ts";

export const replayedEntry = (
	boardId: string,
	input: EntryInput,
	row: unknown,
): Effect.Effect<BoardEntryRow, BoardSourceConflict | StoredBoardEntryInvalid> =>
	Effect.gen(function* () {
		const existing = yield* entryRow(row);
		const expected = storedEntryVariant(input);
		const matches =
			existing.authorAgentId === Option.getOrElse(input.authorAgentId, () => null) &&
			existing.body === input.body &&
			existing.kind === expected.kind &&
			existing.precedence === expected.precedence &&
			existing.register === entryRegister(input) &&
			existing.sourceRef === expected.sourceRef;
		if (!matches) {
			return yield* new BoardSourceConflict({
				boardId,
				sourceRef: expected.sourceRef ?? "missing",
			});
		}
		return existing;
	});
