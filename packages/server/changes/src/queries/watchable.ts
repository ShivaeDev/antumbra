import type { watchable as query } from "@antumbra/domain-changes/queries/watchable.ts";
import { watchable as queryDecision } from "@antumbra/server-changes/logic/queries/watchable.ts";
import { Effect, type Schema } from "effect";
export const watchable = Effect.fn("Changes.watchable")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
