import type { browse as query } from "@antumbra/domain-changes/queries/browse.ts";
import { browse as queryDecision } from "@antumbra/server-changes/logic/queries/browse.ts";
import { Effect, type Schema } from "effect";
export const browse = Effect.fn("Changes.browse")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
