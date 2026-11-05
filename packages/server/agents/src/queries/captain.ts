import type { captain as query } from "@antumbra/domain-agents/queries/captain.ts";
import { captain as queryDecision } from "@antumbra/server-agents/logic/queries/captain.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const captain = Effect.fn("Agents.captain")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
