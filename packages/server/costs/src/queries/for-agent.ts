import type { forAgent as query } from "@antumbra/domain-costs/queries/for-agent.ts";
import { forAgent as queryDecision } from "@antumbra/server-costs/logic/queries/for-agent.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const forAgent = Effect.fn("Costs.forAgent")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
