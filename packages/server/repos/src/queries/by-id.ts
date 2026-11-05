import type { byId as query } from "@antumbra/domain-repos/queries/by-id.ts";
import { byId as queryDecision } from "@antumbra/server-repos/logic/queries/by-id.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("Repos.byId")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
