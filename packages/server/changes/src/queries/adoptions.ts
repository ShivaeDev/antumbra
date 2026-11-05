import type { adoptions as query } from "@antumbra/domain-changes/queries/adoptions.ts";
import { adoptions as queryDecision } from "@antumbra/server-changes/logic/queries/adoptions.ts";
import { Effect, type Schema } from "effect";
export const adoptions = Effect.fn("Changes.adoptions")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
