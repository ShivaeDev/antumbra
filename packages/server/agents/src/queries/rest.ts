import type { rest as query } from "@antumbra/domain-agents/queries/rest.ts";
import { rest as queryDecision } from "@antumbra/server-agents/logic/queries/rest.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const rest = Effect.fn("Agents.rest")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
