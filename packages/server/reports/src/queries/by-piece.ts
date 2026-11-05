import type { byPiece as query } from "@antumbra/domain-reports/queries/by-piece.ts";
import { byPiece as queryDecision } from "@antumbra/server-reports/logic/queries/by-piece.ts";
import { Effect, type Schema } from "effect";
export const byPiece = Effect.fn("Reports.byPiece")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
