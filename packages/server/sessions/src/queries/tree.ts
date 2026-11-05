import type { tree as query } from "@antumbra/domain-sessions/queries/tree.ts";
import { tree as queryDecision } from "@antumbra/server-sessions/logic/queries/tree.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const tree = Effect.fn("Sessions.tree")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
