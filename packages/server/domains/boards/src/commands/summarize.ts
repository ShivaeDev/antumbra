import { command } from "@antumbra/platform-feature/command.ts";
import { SummaryLevelSchema } from "@antumbra/platform-vocabulary/board.ts";
import { Effect, Schema } from "effect";
import { BODY, nextSequence, SPAN, SUMMARY_NEEDS_BODY, SUMMARY_NEEDS_SPAN } from "#commands/board.ts";
import { summaryWritten } from "#facts/summary-written.ts";
import { BoardEntryId, BoardId } from "#ids.ts";
import { boardEntry, Sequence } from "#rows/board-entry.ts";

export const summarize = command("summarize", {
	input: {
		board: BoardId,
		author: Schema.String,
		body: Schema.String,
		coversFrom: Sequence,
		coversTo: Sequence,
		level: SummaryLevelSchema,
	},
	reads: [boardEntry],
	emits: summaryWritten,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
	run: Effect.fn("boards.summarize")(function* (input, rows, reject) {
		const body = input.body.trim();
		if (body === "") {
			return yield* reject.Blank({ field: BODY, message: SUMMARY_NEEDS_BODY });
		}
		if (input.coversTo < input.coversFrom) {
			return yield* reject.Blank({ field: SPAN, message: SUMMARY_NEEDS_SPAN });
		}
		return {
			authorAgentId: input.author,
			board: input.board,
			body,
			coversFrom: input.coversFrom,
			coversTo: input.coversTo,
			id: BoardEntryId.make(input.requestId),
			level: input.level,
			number: yield* nextSequence(rows, input.board),
		};
	}),
});
