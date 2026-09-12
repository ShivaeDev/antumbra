import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const byId = query("byId", {
	input: { id: PieceId },
	output: Schema.NullOr(piece.Row),
	reads: [piece],
	run: Effect.fn("pieces.byId")(function* (input, rows) {
		const stored = yield* rows.piece.find(input.id);
		return Option.getOrNull(stored);
	}),
});
