import type { world as query } from "@antumbra/domain-changes/queries/world.ts";
import { world as queryDecision } from "@antumbra/server-changes/logic/queries/world.ts";
import { Effect, type Schema } from "effect";
export const world = Effect.fn("Changes.world")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
