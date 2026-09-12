import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionEvent } from "#rows/session-event.ts";

export const transcriptSources = query("transcriptSources", {
	input: { id: SessionId },
	output: Schema.Struct({ references: Schema.Array(sessionEvent.Row), nodes: Schema.Array(session.Row) }),
	reads: [sessionEvent, session],
	run: Effect.fn("Sessions.transcriptSources")(function* (input, rows) {
		const held = yield* rows.session.find(input.id);
		return {
			references: (yield* rows.sessionEvent.where({ sessionId: input.id })).toSorted((a, b) => a.sequence - b.sequence),
			nodes: Option.isNone(held) ? [] : yield* rows.session.where({ rootSessionId: held.value.rootSessionId }),
		};
	}),
});
