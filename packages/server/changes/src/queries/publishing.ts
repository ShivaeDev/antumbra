import type { publishing as query } from "@antumbra/domain-changes/queries/publishing.ts";
import { publishing as queryDecision } from "@antumbra/server-changes/logic/queries/publishing.ts";
import { Effect, type Schema } from "effect";
export const publishing = Effect.fn("Changes.publishing")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
