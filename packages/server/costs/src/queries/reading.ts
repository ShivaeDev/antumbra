import type { reading as query } from "@antumbra/domain-costs/queries/reading.ts";
import { reading as queryDecision } from "@antumbra/server-costs/logic/queries/reading.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const reading = Effect.fn("Costs.reading")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
