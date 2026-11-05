import type * as Source from "@antumbra/domain-sessions/queries/tool-call.ts";
import { selection as sessionToolCallSelection } from "@antumbra/server-storage/records/session-tool-call.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const toolCall = Effect.fn("Sessions.toolCall")(function* (
	input: Schema.Struct.Type<typeof Source.toolCall.input>,
): Effect.fn.Return<typeof Source.toolCall.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.sessionToolCall
			.findOne({
				where: { id: `${input.sessionId}:${input.callId}` },
				orderBy: { field: "storage_order", direction: "asc" },
				select: sessionToolCallSelection,
			})
			.pipe(Effect.orDie),
	);
});
