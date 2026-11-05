import type { pendingOperations as query } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { pendingOperations as queryDecision } from "@antumbra/server-agents/logic/queries/pending-operations.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const pendingOperations = Effect.fn("Agents.pendingOperations")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
