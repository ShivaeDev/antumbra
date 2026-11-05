import type { open as query } from "@antumbra/domain-rulings/queries/open.ts";
import { open as queryDecision } from "@antumbra/server-rulings/logic/queries/open.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const open = Effect.fn("Rulings.open")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
