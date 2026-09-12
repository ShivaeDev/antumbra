import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { PieceId } from "#example/ids.ts";
import { Roster } from "#example/ports/roster.ts";
import { piece } from "#example/rows/piece.ts";

export const chartered = query("chartered", {
	input: {},
	output: Schema.Struct({ crew: Schema.Array(Schema.String), pieces: Schema.Array(PieceId) }),
	reads: [piece],
	ports: [Roster],
	run: Effect.fn("pieces.chartered")(function* (_input, rows, ports) {
		const waiting = yield* rows.piece.where({ status: "chartered" });
		const crew = yield* ports.roster.crew;
		return { crew, pieces: waiting.map((found) => found.id) };
	}),
});
