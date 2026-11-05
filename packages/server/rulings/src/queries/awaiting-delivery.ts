import type { awaitingDelivery as query } from "@antumbra/domain-rulings/queries/awaiting-delivery.ts";
import { awaitingDelivery as queryDecision } from "@antumbra/server-rulings/logic/queries/awaiting-delivery.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const awaitingDelivery = Effect.fn("Rulings.awaitingDelivery")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
