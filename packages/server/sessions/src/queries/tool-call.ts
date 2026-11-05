import type { toolCall as query } from "@antumbra/domain-sessions/queries/tool-call.ts";
import { toolCall as queryDecision } from "@antumbra/server-sessions/logic/queries/tool-call.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const toolCall = Effect.fn("Sessions.toolCall")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
