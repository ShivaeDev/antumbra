import type { unaudited as query } from "@antumbra/domain-sessions/queries/unaudited.ts";
import { unaudited as queryDecision } from "@antumbra/server-sessions/logic/queries/unaudited.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const unaudited = Effect.fn("Sessions.unaudited")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
