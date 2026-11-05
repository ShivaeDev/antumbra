import type { deliveryReading as query } from "@antumbra/domain-inputs/queries/delivery.ts";
import { deliveryReading as queryDecision } from "@antumbra/server-inputs/logic/queries/delivery.ts";
import { Effect, type Schema } from "effect";
export const deliveryReading = Effect.fn("Inputs.deliveryReading")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
