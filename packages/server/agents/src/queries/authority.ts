import type { authority as query } from "@antumbra/domain-agents/queries/authority.ts";
import { authority as queryDecision } from "@antumbra/server-agents/logic/queries/authority.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const authority = Effect.fn("Agents.authority")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
