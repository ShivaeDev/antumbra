import type { pending as query } from "@antumbra/domain-lifecycle/queries/pending.ts";
import { pending as queryDecision } from "@antumbra/server-lifecycle/logic/queries/pending.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const pending = Effect.fn("Lifecycle.pending")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
