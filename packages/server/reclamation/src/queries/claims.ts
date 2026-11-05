import type { claims as query } from "@antumbra/domain-reclamation/queries/claims.ts";
import { claims as queryDecision } from "@antumbra/server-reclamation/logic/queries/claims.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const claims = Effect.fn("Reclamation.claims")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
