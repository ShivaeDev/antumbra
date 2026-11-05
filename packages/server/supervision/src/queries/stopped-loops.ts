import type { stoppedLoops as query } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { stoppedLoops as queryDecision } from "@antumbra/server-supervision/logic/queries/stopped-loops.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const stoppedLoops = Effect.fn("Supervision.stoppedLoops")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
