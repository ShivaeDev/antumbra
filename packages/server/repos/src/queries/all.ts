import type { all as query } from "@antumbra/domain-repos/queries/all.ts";
import { all as queryDecision } from "@antumbra/server-repos/logic/queries/all.ts";
import { Effect, type Schema } from "effect";
export const all = Effect.fn("Repos.all")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
