import { command } from "@antumbra/platform-feature/command.ts";
import { choice, many, titled } from "@antumbra/platform-feature/edit.ts";
import { Schema } from "effect";
import { pieceRewired } from "#facts/piece-rewired.ts";
import { PieceId } from "#ids.ts";
import { others } from "#queries/others.ts";
import { piece } from "#rows/piece.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const rewire = command("rewire", {
	input: {
		id: PieceId,
		dependsOn: titled(many(choice(others, { input: { id: "id", voyageId: "voyageId" }, label: "title", value: "id" })), { title: "Depends on" }),
	},
	reads: [piece, pieceEdge],
	emits: pieceRewired,
	rejections: {
		Unknown: { id: Schema.String },
		UnknownDependency: { pieceId: Schema.String },
		WouldCycle: { field: Schema.String, from: Schema.String, message: Schema.String, to: Schema.String },
	},
});
