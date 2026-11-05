import type { byIds as query } from "@antumbra/domain-repos/queries/by-ids.ts";
import { byIds as queryDecision } from "@antumbra/server-repos/logic/queries/by-ids.ts";
import { Effect, type Schema } from "effect";
export const byIds = Effect.fn("Repos.byIds")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
