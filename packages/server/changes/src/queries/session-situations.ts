import type { sessionSituations as query } from "@antumbra/domain-changes/queries/session-situations.ts";
import { sessionSituations as queryDecision } from "@antumbra/server-changes/logic/queries/session-situations.ts";
import { Effect, type Schema } from "effect";
export const sessionSituations = Effect.fn("Changes.sessionSituations")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
