import type { operations as query } from "@antumbra/domain-sessions/queries/operations.ts";
import { operations as queryDecision } from "@antumbra/server-sessions/logic/queries/operations.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const operations = Effect.fn("Sessions.operations")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
