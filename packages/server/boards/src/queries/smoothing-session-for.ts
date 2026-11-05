import type { smoothingSessionFor as query } from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import { smoothingSessionFor as queryDecision } from "@antumbra/server-boards/logic/queries/smoothing-session-for.ts";
import { Effect, type Schema } from "effect";
export const smoothingSessionFor = Effect.fn("Boards.smoothingSessionFor")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
