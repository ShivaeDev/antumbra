import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";

export const toolCalled = fact("SessionToolCalled", { sessionId: SessionId, callId: Schema.String, name: Schema.String, input: Schema.String });
export const callTool = command("callTool", {
	input: toolCalled.payload,
	reads: [session],
	emits: toolCalled,
	rejections: {},
	run: Effect.fn("Sessions.callTool")(function* (input, rows) {
		yield* rows.session.get(input.sessionId);
		return { sessionId: input.sessionId, callId: input.callId, name: input.name, input: input.input };
	}),
});
export const toolCalledMaterializer = materializer(toolCalled, {
	writes: [session, sessionToolCall],
	run: Effect.fn("Sessions.toolCalled")(function* (fact, rows) {
		const id = `${fact.sessionId}:${fact.callId}`;
		const call = yield* rows.sessionToolCall.find(id);
		if (Option.isSome(call) && call.value.calledAt !== null) return;
		const calledAt = new Date(fact.at).toISOString();
		if (Option.isNone(call))
			yield* rows.sessionToolCall.insert({
				id,
				sessionId: fact.sessionId,
				callId: fact.callId,
				name: fact.name,
				input: fact.input,
				calledAt,
				answer: null,
				answeredAt: null,
			});
		else yield* rows.sessionToolCall.update(id, { calledAt });
		const root = yield* rows.session.get(fact.sessionId);
		yield* rows.session.update(root.id, { toolCalls: root.toolCalls + 1 });
	}),
});
