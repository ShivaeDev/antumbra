import type * as Source from "@antumbra/domain-boards/commands/write.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { BoardEntryId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { BODY, NEEDS_BODY, nextSequence, standing } from "@antumbra/server-boards/logic/commands/board.ts";
import type { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const write = Effect.fn("boards.write")(function* (
	input: typeof Source.write.Input.Type,
	reject: typeof Source.write.reject,
): Effect.fn.Return<typeof Source.write.emits.Payload.Type, RejectedBy<typeof Source.write.rejections>, Records> {
	const body = input.body.trim();
	if (body === "") {
		return yield* reject.Blank({ field: BODY, message: NEEDS_BODY });
	}
	if (!(yield* standing(input.board))) {
		return yield* reject.UnknownBoard({ board: input.board });
	}
	return {
		authorAgentId: input.author,
		board: input.board,
		body,
		id: BoardEntryId.make(input.requestId),
		number: yield* nextSequence(input.board),
		register: input.register,
	};
});
