import type { awaitingAscent as query } from "@antumbra/domain-rulings/queries/awaiting-ascent.ts";
import { awaitingAscent as queryDecision } from "@antumbra/server-rulings/logic/queries/awaiting-ascent.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const awaitingAscent = Effect.fn("Rulings.awaitingAscent")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
