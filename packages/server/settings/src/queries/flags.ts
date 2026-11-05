import type { flags as query } from "@antumbra/domain-settings/queries/flags.ts";
import { flags as queryDecision } from "@antumbra/server-settings/logic/queries/flags.ts";
import { Effect, type Schema } from "effect";
export const flags = Effect.fn("Settings.flags")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
