import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

export const toolAnswered = fact("SessionToolAnswered", {
	sessionId: SessionId,
	callId: Schema.String,
	name: Schema.String,
	input: Schema.String,
	answer: ToolAnswer,
});
export const answerTool = command("answerTool", {
	input: toolAnswered.payload,
	reads: [],
	emits: toolAnswered,
	rejections: {},
});
