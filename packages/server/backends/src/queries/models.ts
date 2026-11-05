import type { models as query } from "@antumbra/domain-backends/queries/models.ts";
import { models as queryDecision } from "@antumbra/server-backends/logic/queries/models.ts";
import { Effect, type Schema } from "effect";
export const models = Effect.fn("Backends.models")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
