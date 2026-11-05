import type { bySession as query } from "@antumbra/domain-agents/queries/by-session.ts";
import { bySession as queryDecision } from "@antumbra/server-agents/logic/queries/by-session.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const bySession = Effect.fn("Agents.bySession")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
