import type * as Source from "@antumbra/domain-boards/commands/summarize.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { BoardEntryId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { BODY, nextSequence, SPAN, SUMMARY_NEEDS_BODY, SUMMARY_NEEDS_SPAN } from "@antumbra/server-boards/logic/commands/board.ts";
import type { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const summarize = Effect.fn("boards.summarize")(function* (
	input: typeof Source.summarize.Input.Type,
	reject: typeof Source.summarize.reject,
): Effect.fn.Return<typeof Source.summarize.emits.Payload.Type, RejectedBy<typeof Source.summarize.rejections>, Records> {
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
		number: yield* nextSequence(input.board),
	};
});
