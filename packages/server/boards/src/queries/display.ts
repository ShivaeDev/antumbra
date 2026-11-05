import type { display as query } from "@antumbra/domain-boards/queries/display.ts";
import { display as queryDecision } from "@antumbra/server-boards/logic/queries/display.ts";
import { Effect, type Schema } from "effect";
export const display = Effect.fn("Boards.display")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
