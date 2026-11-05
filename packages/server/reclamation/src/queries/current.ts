import type { current as query } from "@antumbra/domain-reclamation/queries/moorage.ts";
import { current as queryDecision } from "@antumbra/server-reclamation/logic/queries/moorage.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const current = Effect.fn("Reclamation.current")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
