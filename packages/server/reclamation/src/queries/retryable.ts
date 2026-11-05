import type { retryable as query } from "@antumbra/domain-reclamation/queries/retryable.ts";
import { retryable as queryDecision } from "@antumbra/server-reclamation/logic/queries/retryable.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const retryable = Effect.fn("Reclamation.retryable")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
