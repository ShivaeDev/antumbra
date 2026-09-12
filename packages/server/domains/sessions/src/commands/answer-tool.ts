import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { ToolAnswer } from "@antumbra/platform-runner/tools.ts";
import { Effect, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";

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
	run: (input) => Effect.succeed({ sessionId: input.sessionId, callId: input.callId, name: input.name, input: input.input, answer: input.answer }),
});
export const toolAnsweredMaterializer = materializer(toolAnswered, {
	writes: [sessionToolCall],
	run: Effect.fn("Sessions.toolAnswered")(function* (fact, rows) {
		const id = `${fact.sessionId}:${fact.callId}`;
		const at = new Date(fact.at).toISOString();
		if (yield* rows.sessionToolCall.exists(id)) yield* rows.sessionToolCall.update(id, { answer: fact.answer });
		else
			yield* rows.sessionToolCall.insert({
				id,
				sessionId: fact.sessionId,
				name: fact.name,
				input: fact.input,
				answer: fact.answer,
				calledAt: at,
				answeredAt: null,
			});
	}),
});
