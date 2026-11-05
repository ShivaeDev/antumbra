import type { smoothingTargets as query } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { smoothingTargets as queryDecision } from "@antumbra/server-boards/logic/queries/smoothing-targets.ts";
import { Effect, type Schema } from "effect";
export const smoothingTargets = Effect.fn("Boards.smoothingTargets")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
