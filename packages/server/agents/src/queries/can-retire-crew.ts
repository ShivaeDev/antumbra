import type { canRetireCrew as query } from "@antumbra/domain-agents/queries/can-retire-crew.ts";
import { canRetireCrew as queryDecision } from "@antumbra/server-agents/logic/queries/can-retire-crew.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const canRetireCrew = Effect.fn("Agents.canRetireCrew")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
