import type * as Source from "@antumbra/domain-sessions/commands/answer-tool.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Effect, Schema } from "effect";

export const toolAnswered = fact("SessionToolAnswered", {
	sessionId: SessionId,
	callId: Schema.String,
	name: Schema.String,
	input: Schema.String,
	answer: ToolAnswer,
});
export const answerTool = (input: typeof Source.answerTool.Input.Type) =>
	Effect.succeed({ sessionId: input.sessionId, callId: input.callId, name: input.name, input: input.input, answer: input.answer });
