import type { digest as query } from "@antumbra/domain-boards/queries/digest.ts";
import { digest as queryDecision } from "@antumbra/server-boards/logic/queries/digest.ts";
import { Effect, type Schema } from "effect";
export const digest = Effect.fn("Boards.digest")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
