import type { queues as query } from "@antumbra/domain-holds/queries/queues.ts";
import { queues as queryDecision } from "@antumbra/server-holds/logic/queries/queues.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const queues = Effect.fn("Holds.queues")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
