import type { byId as query } from "@antumbra/domain-artifacts/queries/by-id.ts";
import { byId as queryDecision } from "@antumbra/server-artifacts/logic/queries/by-id.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("Artifacts.byId")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
