import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const toolAnswered = fact("SessionToolAnswered", {
	sessionId: SessionId,
	callId: Schema.String,
	name: Schema.String,
	input: Schema.String,
	answer: ToolAnswer,
});
export const toolAnsweredMaterializer = Effect.fn("Sessions.toolAnswered")(function* (
	fact: FactValue<typeof toolAnswered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const id = `${fact.sessionId}:${fact.callId}`;

	if (
		yield* rows.sessionToolCall.count({ where: { id: id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.sessionToolCall.updateVoid({ ...{ answer: fact.answer }, id: id }).pipe(Effect.orDie);
	else
		yield* rows.sessionToolCall
			.insertVoid({
				id,
				sessionId: fact.sessionId,
				callId: fact.callId,
				name: fact.name,
				input: fact.input,
				answer: fact.answer,
				calledAt: null,
				answeredAt: null,
			})
			.pipe(Effect.orDie);
});
