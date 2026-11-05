import type { byId as query } from "@antumbra/domain-rulings/queries/by-id.ts";
import { byId as queryDecision } from "@antumbra/server-rulings/logic/queries/by-id.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const byId = Effect.fn("Rulings.byId")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
