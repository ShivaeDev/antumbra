import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, many, titled } from "@antumbra/platform-feature/edit.ts";
import { Schema } from "effect";
import { pieceChartered } from "#facts/piece-chartered.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { piece } from "#rows/piece.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const charter = command("charter", {
	input: {
		voyageId: VoyageId,
		title: titled(Schema.String, { title: "Title" }),
		charter: titled(Schema.String, { multiline: true, title: "Charter" }),
		expectation: titled(Schema.String, { title: "Expectation" }),
		role: titled(Schema.String, { title: "Role" }),
		dependsOn: titled(many(choice(byVoyage, { input: { voyageId: "voyageId" }, label: "title", value: "id" })), { title: "Depends on" }),
	},
	reads: [voyage, piece, pieceEdge],
	emits: pieceChartered,
	rejections: {
		Blank: { field: Schema.String, message: Schema.String },
		UnknownVoyage: { voyageId: Schema.String },
		UnknownDependency: { pieceId: Schema.String },
		WouldCycle: { field: Schema.String, from: Schema.String, message: Schema.String, to: Schema.String },
	},
});
