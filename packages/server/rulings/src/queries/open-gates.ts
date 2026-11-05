import type { openGates as query } from "@antumbra/domain-rulings/queries/open-gates.ts";
import { openGates as queryDecision } from "@antumbra/server-rulings/logic/queries/open-gates.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const openGates = Effect.fn("Rulings.openGates")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
