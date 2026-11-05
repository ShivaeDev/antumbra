import type { forVoyage as query } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { forVoyage as queryDecision } from "@antumbra/server-role-settings/logic/queries/for-voyage.ts";
import { Effect, type Schema } from "effect";
export const forVoyage = Effect.fn("RoleSettings.forVoyage")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
