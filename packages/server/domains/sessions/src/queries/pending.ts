import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { sessionOperation } from "#rows/session-operation.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation],
	run: Effect.fn("sessions.pending")(function* (_input, rows) {
		return yield* rows.sessionOperation.where({ status: "requested" });
	}),
});
