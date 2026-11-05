import type { all as query } from "@antumbra/domain-agents/queries/all.ts";
import { all as queryDecision } from "@antumbra/server-agents/logic/queries/all.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const all = Effect.fn("Agents.all")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
