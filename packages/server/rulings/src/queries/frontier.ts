import type { frontier as query } from "@antumbra/domain-rulings/queries/frontier.ts";
import { frontier as queryDecision } from "@antumbra/server-rulings/logic/queries/frontier.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const frontier = Effect.fn("Rulings.frontier")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
