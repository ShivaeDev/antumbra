import type { opening as query } from "@antumbra/domain-sessions/queries/opening.ts";
import { opening as queryDecision } from "@antumbra/server-sessions/logic/queries/opening.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const opening = Effect.fn("Sessions.opening")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
