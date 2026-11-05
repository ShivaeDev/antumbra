import type { efforts as query } from "@antumbra/domain-backends/queries/efforts.ts";
import { efforts as queryDecision } from "@antumbra/server-backends/logic/queries/efforts.ts";
import { Effect, type Schema } from "effect";
export const efforts = Effect.fn("Backends.efforts")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
