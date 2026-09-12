import { Effect, Option } from "effect";
import type { Observation, Rows, Session } from "#materializers/observation/types.ts";
export const tools = Effect.fn("sessions.tools")(function* (fact: Observation, rows: Rows, current: Session) {
	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();

	if (evidence.type === "tool-called") {
		const id = `${current.id}:${evidence.callId}`;
		const call = yield* rows.sessionToolCall.find(id);
		if (Option.isNone(call)) {
			yield* rows.sessionToolCall.insert({
				id,
				sessionId: current.id,
				callId: evidence.callId,
				name: evidence.name,
				input: evidence.input,
				answeredAt: null,
				answer: null,
				calledAt: at,
			});
			yield* rows.session.update(current.id, { toolCalls: current.toolCalls + 1 });
		} else if (call.value.calledAt === null) {
			yield* rows.sessionToolCall.update(id, { calledAt: at });
			yield* rows.session.update(current.id, { toolCalls: current.toolCalls + 1 });
		}
	}
	if (evidence.type === "tool-answered") {
		const id = `${current.id}:${evidence.callId}`;
		const call = yield* rows.sessionToolCall.find(id);
		if (Option.isSome(call) && call.value.answeredAt === null) {
			yield* rows.sessionToolCall.update(id, { answeredAt: at });
			yield* rows.session.update(current.id, { toolCalls: Math.max(0, current.toolCalls - 1) });
		}
	}
});
