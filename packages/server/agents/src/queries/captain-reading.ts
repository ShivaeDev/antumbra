import type { captain as query } from "@antumbra/domain-agents/queries/captain-reading.ts";
import { captain as queryDecision } from "@antumbra/server-agents/logic/queries/captain-reading.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const captainReading = Effect.fn("Agents.captainReading")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
