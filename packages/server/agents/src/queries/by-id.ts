import type { byId as query } from "@antumbra/domain-agents/queries/by-id.ts";
import { byId as queryDecision } from "@antumbra/server-agents/logic/queries/by-id.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const byId = Effect.fn("Agents.byId")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
