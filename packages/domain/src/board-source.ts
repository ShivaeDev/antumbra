import { Effect, Option } from "effect";
import type { BoardEntryRow, EntryInput } from "#board-rows.ts";
import { entryRow } from "#board-rows.ts";
import { BoardSourceConflict, type StoredBoardEntryInvalid } from "#errors.ts";

export const replayedEntry = (
	boardId: string,
	input: EntryInput,
	row: unknown,
): Effect.Effect<
	BoardEntryRow,
	BoardSourceConflict | StoredBoardEntryInvalid
> =>
	Effect.gen(function* () {
		const existing = yield* entryRow(row);
		const matches =
			existing.authorAgentId ===
				Option.getOrElse(input.authorAgentId, () => null) &&
			existing.body === input.body &&
			existing.kind === (input.kind ?? "note") &&
			existing.precedence === (input.precedence ?? "routine") &&
			existing.register === input.register &&
			existing.sourceRef === (input.sourceRef ?? null);
		if (!matches) {
			return yield* new BoardSourceConflict({
				boardId,
				sourceRef: input.sourceRef ?? "missing",
			});
		}
		return existing;
	});
