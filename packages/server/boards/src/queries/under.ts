import type { under as query } from "@antumbra/domain-boards/queries/under.ts";
import { under as queryDecision } from "@antumbra/server-boards/logic/queries/under.ts";
import { Effect, type Schema } from "effect";
export const under = Effect.fn("Boards.under")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
