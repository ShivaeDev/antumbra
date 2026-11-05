import type { byVoyage as query } from "@antumbra/domain-agents/queries/by-voyage.ts";
import { byVoyage as queryDecision } from "@antumbra/server-agents/logic/queries/by-voyage.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const byVoyage = Effect.fn("Agents.byVoyage")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
