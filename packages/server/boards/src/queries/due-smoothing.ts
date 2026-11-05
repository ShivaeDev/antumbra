import type { dueSmoothing as query } from "@antumbra/domain-boards/queries/due-smoothing.ts";
import { dueSmoothing as queryDecision } from "@antumbra/server-boards/logic/queries/due-smoothing.ts";
import { Effect, type Schema } from "effect";
export const dueSmoothing = Effect.fn("Boards.dueSmoothing")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
