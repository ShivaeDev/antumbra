import type { admitted as query } from "@antumbra/domain-agents/queries/admitted.ts";
import { admitted as queryDecision } from "@antumbra/server-agents/logic/queries/admitted.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const admitted = Effect.fn("Agents.admitted")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
