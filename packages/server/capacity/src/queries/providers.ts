import type { providers as query } from "@antumbra/domain-capacity/queries/providers.ts";
import { providers as queryDecision } from "@antumbra/server-capacity/logic/queries/providers.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const providers = Effect.fn("Capacity.providers")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
