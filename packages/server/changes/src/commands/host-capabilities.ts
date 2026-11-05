import type { hostCapabilities as query } from "@antumbra/domain-changes/commands/host-capability.ts";
import { hostCapabilities as queryDecision } from "@antumbra/server-changes/logic/commands/host-capability.ts";
import { Effect, type Schema } from "effect";
export const hostCapabilities = Effect.fn("Changes.hostCapabilities")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
