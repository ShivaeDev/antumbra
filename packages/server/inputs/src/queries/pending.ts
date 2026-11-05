import type { pending as query } from "@antumbra/domain-inputs/queries/pending.ts";
import { pending as queryDecision } from "@antumbra/server-inputs/logic/queries/pending.ts";
import { Effect, type Schema } from "effect";
export const pending = Effect.fn("Inputs.pending")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
