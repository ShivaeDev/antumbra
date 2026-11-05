import type { reading as query } from "@antumbra/domain-inputs/queries/reading.ts";
import { reading as queryDecision } from "@antumbra/server-inputs/logic/queries/reading.ts";
import { Effect, type Schema } from "effect";
export const reading = Effect.fn("Inputs.reading")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
