import type { support as query } from "@antumbra/domain-inputs/queries/support.ts";
import { support as queryDecision } from "@antumbra/server-inputs/logic/queries/support.ts";
import { Effect, type Schema } from "effect";
export const support = Effect.fn("Inputs.support")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
