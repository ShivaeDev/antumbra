import type { byId as query } from "@antumbra/domain-reports/queries/by-id.ts";
import { byId as queryDecision } from "@antumbra/server-reports/logic/queries/by-id.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("Reports.byId")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
