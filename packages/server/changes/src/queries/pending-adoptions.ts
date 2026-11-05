import type { pendingAdoptions as query } from "@antumbra/domain-changes/queries/pending-adoptions.ts";
import { pendingAdoptions as queryDecision } from "@antumbra/server-changes/logic/queries/pending-adoptions.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const pendingAdoptions = Effect.fn("Changes.pendingAdoptions")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
