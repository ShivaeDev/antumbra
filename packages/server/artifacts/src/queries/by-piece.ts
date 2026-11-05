import type { byPiece as query } from "@antumbra/domain-artifacts/queries/by-piece.ts";
import { byPiece as queryDecision } from "@antumbra/server-artifacts/logic/queries/by-piece.ts";
import { Effect, type Schema } from "effect";
export const byPiece = Effect.fn("Artifacts.byPiece")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
