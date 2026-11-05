import type { smoother as query } from "@antumbra/domain-agents/queries/smoother.ts";
import { smoother as queryDecision } from "@antumbra/server-agents/logic/queries/smoother.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const smoother = Effect.fn("Agents.smoother")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
