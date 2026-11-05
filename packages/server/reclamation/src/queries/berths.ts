import type { berths as query } from "@antumbra/domain-reclamation/queries/berths.ts";
import { berths as queryDecision } from "@antumbra/server-reclamation/logic/queries/berths.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const berths = Effect.fn("Reclamation.berths")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
