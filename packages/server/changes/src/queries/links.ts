import type { links as query } from "@antumbra/domain-changes/queries/links.ts";
import { links as queryDecision } from "@antumbra/server-changes/logic/queries/links.ts";
import { Effect, type Schema } from "effect";
export const links = Effect.fn("Changes.links")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
