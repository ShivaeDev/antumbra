import { Effect, Option } from "effect";
import { mailRow } from "#entries.ts";
import { BoardSourceConflict, type StoredBoardEntryInvalid } from "#errors.ts";
import type { MailEntry, MailRow } from "#model.ts";

export const replayedMail = (
	boardId: string,
	input: MailEntry,
	row: unknown,
): Effect.Effect<MailRow, BoardSourceConflict | StoredBoardEntryInvalid> =>
	Effect.gen(function* () {
		const existing = yield* mailRow(row);
		const matches =
			existing.authorAgentId === Option.getOrElse(input.authorAgentId, () => null) &&
			existing.body === input.body &&
			existing.precedence === input.precedence &&
			existing.register === input.register &&
			existing.sourceRef === input.sourceRef;
		return matches ? existing : yield* new BoardSourceConflict({ boardId, sourceRef: input.sourceRef });
	});
