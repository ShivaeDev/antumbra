import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
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
});
