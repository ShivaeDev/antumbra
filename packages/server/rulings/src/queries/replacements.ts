import type { replacements as query } from "@antumbra/domain-rulings/queries/replacements.ts";
import { replacements as queryDecision } from "@antumbra/server-rulings/logic/queries/replacements.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const replacements = Effect.fn("Rulings.replacements")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
