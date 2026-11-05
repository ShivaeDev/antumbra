import type { archivable as query } from "@antumbra/domain-changes/queries/archivable.ts";
import { archivable as queryDecision } from "@antumbra/server-changes/logic/queries/archivable.ts";
import { Effect, type Schema } from "effect";
export const archivable = Effect.fn("Changes.archivable")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
