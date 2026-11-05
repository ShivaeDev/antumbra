import type { quay as query } from "@antumbra/domain-changes/queries/quay.ts";
import { quay as queryDecision } from "@antumbra/server-changes/logic/queries/quay.ts";
import { Effect, type Schema } from "effect";
export const quay = Effect.fn("Changes.quay")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
