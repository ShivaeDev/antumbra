import type { standing as query } from "@antumbra/domain-rulings/queries/standing.ts";
import { standing as queryDecision } from "@antumbra/server-rulings/logic/queries/standing.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const standing = Effect.fn("Rulings.standing")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
