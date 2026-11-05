import type { birthBySession as query } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import { birthBySession as queryDecision } from "@antumbra/server-agents/logic/queries/birth-by-session.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const birthBySession = Effect.fn("Agents.birthBySession")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
