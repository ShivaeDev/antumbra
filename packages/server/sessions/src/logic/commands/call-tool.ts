import type * as Source from "@antumbra/domain-sessions/commands/call-tool.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session as sessionRecordSchema } from "@antumbra/domain-sessions/rows/session.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

export const toolCalled = fact("SessionToolCalled", { sessionId: SessionId, callId: Schema.String, name: Schema.String, input: Schema.String });
export const callTool = Effect.fn("Sessions.callTool")(function* (
	input: typeof Source.callTool.Input.Type,
): Effect.fn.Return<typeof Source.callTool.emits.Payload.Type, RejectedBy<typeof Source.callTool.rejections>, Records> {
	const rows = yield* Records;

	yield* rows.session.findById(input.sessionId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie);
	return { sessionId: input.sessionId, callId: input.callId, name: input.name, input: input.input };
});
