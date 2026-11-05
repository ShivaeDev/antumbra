import type { choices as query } from "@antumbra/domain-rulings/queries/choices.ts";
import { choices as queryDecision } from "@antumbra/server-rulings/logic/queries/choices.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const choices = Effect.fn("Rulings.choices")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
