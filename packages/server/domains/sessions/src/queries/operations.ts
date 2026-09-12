import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const operations = query("operations", {
	input: { sessionId: SessionId },
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation],
	scope: (input) => input.sessionId,
	run: Effect.fn("Sessions.operations")(function* (input, rows) {
		const stored = yield* rows.sessionOperation.where({ sessionId: input.sessionId });
		return stored.toSorted((left, right) => left.requestedAt.localeCompare(right.requestedAt));
	}),
});
