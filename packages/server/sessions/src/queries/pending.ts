import type { pending as query } from "@antumbra/domain-sessions/queries/pending.ts";
import { pending as queryDecision } from "@antumbra/server-sessions/logic/queries/pending.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const pending = Effect.fn("Sessions.pending")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
