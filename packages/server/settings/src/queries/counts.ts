import type { counts as query } from "@antumbra/domain-settings/queries/counts.ts";
import { counts as queryDecision } from "@antumbra/server-settings/logic/queries/counts.ts";
import { Effect, type Schema } from "effect";
export const counts = Effect.fn("Settings.counts")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
