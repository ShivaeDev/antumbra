import type { roster as query } from "@antumbra/domain-agents/queries/roster.ts";
import { roster as queryDecision } from "@antumbra/server-agents/logic/queries/roster.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const roster = Effect.fn("Agents.roster")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
