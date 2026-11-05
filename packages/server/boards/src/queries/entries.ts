import type { entries as query } from "@antumbra/domain-boards/queries/entries.ts";
import { entries as queryDecision } from "@antumbra/server-boards/logic/queries/entries.ts";
import { Effect, type Schema } from "effect";
export const entries = Effect.fn("Boards.entries")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
