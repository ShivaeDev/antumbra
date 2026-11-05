import type { candidates as query } from "@antumbra/domain-reclamation/queries/candidates.ts";
import { candidates as queryDecision } from "@antumbra/server-reclamation/logic/queries/candidates.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const candidates = Effect.fn("Reclamation.candidates")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
