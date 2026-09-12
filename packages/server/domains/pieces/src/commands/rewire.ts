import { command } from "@antumbra/platform-feature/command.ts";
import { choice, many, titled } from "@antumbra/platform-feature/edit.ts";
import { Effect, Schema } from "effect";
import { DEPENDS_ON, WOULD_CYCLE, wiring } from "#commands/wiring.ts";
import { pieceRewired } from "#facts/piece-rewired.ts";
import { PieceId } from "#ids.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { pieceEdge } from "#rows/piece-edge.ts";
import { piece } from "#rows/piece.ts";

export const rewire = command("rewire", {
	input: {
		id: PieceId,
		dependsOn: titled(many(choice(byVoyage, { input: { voyageId: "voyageId" }, label: "title", value: "id" })), { title: "Depends on" }),
	},
	reads: [piece, pieceEdge],
	emits: pieceRewired,
	rejections: {
		Unknown: { id: Schema.String },
		UnknownDependency: { pieceId: Schema.String },
		WouldCycle: { field: Schema.String, from: Schema.String, message: Schema.String, to: Schema.String },
	},
	run: Effect.fn("pieces.rewire")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.id))) {
			return yield* reject.Unknown({ id: input.id });
		}
		const wired = yield* wiring(rows, input.id, input.dependsOn);
		if (wired._tag === "Unknown") {
			return yield* reject.UnknownDependency({ pieceId: wired.pieceId });
		}
		if (wired._tag === "Cycle") {
			return yield* reject.WouldCycle({ field: DEPENDS_ON, from: wired.from, message: WOULD_CYCLE, to: wired.to });
		}
		return { dependsOn: wired.dependsOn, id: input.id };
	}),
});
