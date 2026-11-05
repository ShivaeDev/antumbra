import type { display as query } from "@antumbra/domain-rulings/queries/display.ts";
import { display as queryDecision } from "@antumbra/server-rulings/logic/queries/display.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const display = Effect.fn("Rulings.display")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
