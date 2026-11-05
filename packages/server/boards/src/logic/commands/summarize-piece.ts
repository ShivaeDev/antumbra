import type * as Source from "@antumbra/domain-boards/commands/summarize-piece.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { BoardEntryId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { BODY, nextSequence, SUMMARY_NEEDS_BODY } from "@antumbra/server-boards/logic/commands/board.ts";
import type { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const summarizePiece = Effect.fn("boards.summarizePiece")(function* (
	input: typeof Source.summarizePiece.Input.Type,
	reject: typeof Source.summarizePiece.reject,
): Effect.fn.Return<typeof Source.summarizePiece.emits.Payload.Type, RejectedBy<typeof Source.summarizePiece.rejections>, Records> {
	const body = input.body.trim();
	if (body === "") {
		return yield* reject.Blank({ field: BODY, message: SUMMARY_NEEDS_BODY });
	}
	return {
		authorAgentId: input.author,
		board: input.board,
		body,
		id: BoardEntryId.make(input.requestId),
		number: yield* nextSequence(input.board),
		pieceId: input.pieceId,
	};
});
