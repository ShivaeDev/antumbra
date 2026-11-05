import type { defaults as query } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { defaults as queryDecision } from "@antumbra/server-role-settings/logic/queries/defaults.ts";
import { Effect, type Schema } from "effect";
export const defaults = Effect.fn("RoleSettings.defaults")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
