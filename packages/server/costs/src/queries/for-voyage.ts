import type { forVoyage as query } from "@antumbra/domain-costs/queries/for-voyage.ts";
import { forVoyage as queryDecision } from "@antumbra/server-costs/logic/queries/for-voyage.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const forVoyage = Effect.fn("Costs.forVoyage")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
