import type { workingCount as query } from "@antumbra/domain-agents/queries/working-count.ts";
import { workingCount as queryDecision } from "@antumbra/server-agents/logic/queries/working-count.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const workingCount = Effect.fn("Agents.workingCount")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
