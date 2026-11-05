import type { capacityReleased as query } from "@antumbra/domain-sessions/queries/capacity-released.ts";
import { capacityReleased as queryDecision } from "@antumbra/server-sessions/logic/queries/capacity-released.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const capacityReleased = Effect.fn("Sessions.capacityReleased")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
