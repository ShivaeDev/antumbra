import type { forVoyage as query } from "@antumbra/domain-reports/queries/for-voyage.ts";
import { forVoyage as queryDecision } from "@antumbra/server-reports/logic/queries/for-voyage.ts";
import { Effect, type Schema } from "effect";
export const forVoyage = Effect.fn("Reports.forVoyage")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
