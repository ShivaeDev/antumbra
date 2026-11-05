import type { authority as query } from "@antumbra/domain-rulings/queries/authority.ts";
import { authority as queryDecision } from "@antumbra/server-rulings/logic/queries/authority.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const authority = Effect.fn("Rulings.authority")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
