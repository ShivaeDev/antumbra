import type { reading as query } from "@antumbra/domain-sessions/queries/reading.ts";
import { reading as queryDecision } from "@antumbra/server-sessions/logic/queries/reading.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const reading = Effect.fn("Sessions.reading")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
