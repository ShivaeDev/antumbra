import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { RESTART } from "#ids.ts";
import { restart } from "#rows/restart.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.NullOr(Schema.Array(SessionId)),
	reads: [restart],
	run: Effect.fn("Lifecycle.pending")(function* (_input, rows) {
		const held = yield* rows.restart.find(RESTART);
		return Option.isSome(held) ? held.value.sessionIds : null;
	}),
});
