import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session as sessionRecordSchema } from "@antumbra/domain-sessions/rows/session.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { selection as sessionToolCallSelection } from "@antumbra/server-storage/records/session-tool-call.ts";
import { Effect, Option, Schema } from "effect";
import { Records } from "#records.ts";

export const toolCalled = fact("SessionToolCalled", { sessionId: SessionId, callId: Schema.String, name: Schema.String, input: Schema.String });
export const toolCalledMaterializer = Effect.fn("Sessions.toolCalled")(function* (
	fact: FactValue<typeof toolCalled>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const id = `${fact.sessionId}:${fact.callId}`;
	const call = yield* rows.sessionToolCall
		.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionToolCallSelection })
		.pipe(Effect.orDie);
	if (Option.isSome(call) && call.value.calledAt !== null) return;
	const calledAt = new Date(fact.at).toISOString();
	if (Option.isNone(call))
		yield* rows.sessionToolCall
			.insertVoid({
				id,
				sessionId: fact.sessionId,
				callId: fact.callId,
				name: fact.name,
				input: fact.input,
				calledAt,
				answer: null,
				answeredAt: null,
			})
			.pipe(Effect.orDie);
	else yield* rows.sessionToolCall.updateVoid({ ...{ calledAt }, id: id }).pipe(Effect.orDie);
	const root = yield* rows.session.findById(fact.sessionId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie);
	yield* rows.session.updateVoid({ ...{ toolCalls: root.toolCalls + 1 }, id: root.id }).pipe(Effect.orDie);
});
