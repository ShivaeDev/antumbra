import type { byPiece as query } from "@antumbra/domain-agents/queries/by-piece.ts";
import { byPiece as queryDecision } from "@antumbra/server-agents/logic/queries/by-piece.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const byPiece = Effect.fn("Agents.byPiece")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
