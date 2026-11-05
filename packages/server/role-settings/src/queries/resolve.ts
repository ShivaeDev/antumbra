import type { resolve as query } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { resolve as queryDecision } from "@antumbra/server-role-settings/logic/queries/resolve.ts";
import { Effect, type Schema } from "effect";
export const resolve = Effect.fn("RoleSettings.resolve")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
