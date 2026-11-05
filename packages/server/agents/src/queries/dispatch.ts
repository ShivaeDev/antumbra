import type { dispatch as query } from "@antumbra/domain-agents/queries/dispatch.ts";
import { dispatch as queryDecision } from "@antumbra/server-agents/logic/queries/dispatch.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const dispatch = Effect.fn("Agents.dispatch")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
