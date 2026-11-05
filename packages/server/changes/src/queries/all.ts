import type { all as query } from "@antumbra/domain-changes/queries/all.ts";
import { all as queryDecision } from "@antumbra/server-changes/logic/queries/all.ts";
import { Effect, type Schema } from "effect";
export const all = Effect.fn("Changes.all")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
