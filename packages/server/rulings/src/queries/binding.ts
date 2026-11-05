import type { binding as query } from "@antumbra/domain-rulings/queries/binding.ts";
import { binding as queryDecision } from "@antumbra/server-rulings/logic/queries/binding.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const binding = Effect.fn("Rulings.binding")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
