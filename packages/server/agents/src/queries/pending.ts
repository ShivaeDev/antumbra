import type { pending as query } from "@antumbra/domain-agents/queries/pending.ts";
import { pending as queryDecision } from "@antumbra/server-agents/logic/queries/pending.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const pending = Effect.fn("Agents.pending")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
