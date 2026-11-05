import type { delivery as query } from "@antumbra/domain-rulings/queries/delivery.ts";
import { delivery as queryDecision } from "@antumbra/server-rulings/logic/queries/delivery.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const delivery = Effect.fn("Rulings.delivery")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
