import type { smoothingState as query } from "@antumbra/domain-boards/queries/smoothing-state.ts";
import { smoothingState as queryDecision } from "@antumbra/server-boards/logic/queries/smoothing-state.ts";
import { Effect, type Schema } from "effect";
export const smoothingState = Effect.fn("Boards.smoothingState")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
