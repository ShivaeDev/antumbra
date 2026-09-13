import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionEvent } from "#rows/session-event.ts";
import { sessionOpening } from "#rows/session-opening.ts";
import { sessionOperation } from "#rows/session-operation.ts";

export const transcriptSources = query("transcriptSources", {
	input: { id: SessionId },
	output: Schema.Struct({
		references: Schema.Array(sessionEvent.Row),
		nodes: Schema.Array(session.Row),
		opening: Schema.NullOr(sessionOpening.Row),
		instructions: Schema.Array(sessionOperation.Row),
	}),
	reads: [sessionEvent, session, sessionOpening, sessionOperation],
	run: Effect.fn("Sessions.transcriptSources")(function* (input, rows) {
		const held = yield* rows.session.find(input.id);
		const operations = yield* rows.sessionOperation.where({ sessionId: input.id });
		const instructions = [];
		for (const operation of operations) {
			const spoken = operation.kind === "wake" || operation.kind === "steer";
			if (!spoken || operation.inputId !== null || operation.status !== "accepted") continue;
			instructions.push(operation);
		}
		return {
			references: (yield* rows.sessionEvent.where({ sessionId: input.id })).toSorted((a, b) => a.sequence - b.sequence),
			nodes: Option.isNone(held) ? [] : yield* rows.session.where({ rootSessionId: held.value.rootSessionId }),
			opening: Option.getOrNull(yield* rows.sessionOpening.find(input.id)),
			instructions,
		};
	}),
});
