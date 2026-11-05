import type { births as query } from "@antumbra/domain-agents/queries/births.ts";
import { births as queryDecision } from "@antumbra/server-agents/logic/queries/births.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const births = Effect.fn("Agents.births")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
