import { selection as sessionToolCallSelection } from "@antumbra/server-storage/records/session-tool-call.ts";
import { Effect, Option } from "effect";
import type { Observation, Session } from "#projections/sessions/observation-types.ts";
import { Records } from "#records.ts";
export const tools = Effect.fn("sessions.tools")(function* (fact: Observation, current: Session) {
	const rows = yield* Records;

	if (!fact.live) return;
	const evidence = fact.evidence;
	const at = new Date(fact.at).toISOString();

	if (evidence.type === "tool-called") {
		const id = `${current.id}:${evidence.callId}`;
		const call = yield* rows.sessionToolCall
			.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionToolCallSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(call)) {
			yield* rows.sessionToolCall
				.insertVoid({
					id,
					sessionId: current.id,
					callId: evidence.callId,
					name: evidence.name,
					input: evidence.input,
					answeredAt: null,
					answer: null,
					calledAt: at,
				})
				.pipe(Effect.orDie);
			yield* rows.session.updateVoid({ ...{ toolCalls: current.toolCalls + 1 }, id: current.id }).pipe(Effect.orDie);
		} else if (call.value.calledAt === null) {
			yield* rows.sessionToolCall.updateVoid({ ...{ calledAt: at }, id: id }).pipe(Effect.orDie);
			yield* rows.session.updateVoid({ ...{ toolCalls: current.toolCalls + 1 }, id: current.id }).pipe(Effect.orDie);
		}
	}
	if (evidence.type === "tool-answered") {
		const id = `${current.id}:${evidence.callId}`;
		const call = yield* rows.sessionToolCall
			.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionToolCallSelection })
			.pipe(Effect.orDie);
		if (Option.isSome(call) && call.value.answeredAt === null) {
			yield* rows.sessionToolCall.updateVoid({ ...{ answeredAt: at, answer: evidence.answer ?? call.value.answer }, id: id }).pipe(Effect.orDie);
			yield* rows.session.updateVoid({ ...{ toolCalls: Math.max(0, current.toolCalls - 1) }, id: current.id }).pipe(Effect.orDie);
		}
	}
});
