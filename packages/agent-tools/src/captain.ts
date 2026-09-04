import { Schema } from "effect";
import { defineTool } from "#define.ts";

const PieceId = Schema.String.annotate({
	description: "The id of a piece on your voyage, as `read_voyage` shows it.",
});

const DependsOn = Schema.Array(Schema.String).annotate({
	description: "The ids of the pieces this one waits on. Empty means it waits on nothing.",
});

export const charterPieceSpec = defineTool({
	description: "Define a bounded Piece of work on your Voyage, with an expected outcome and dependencies. Launch it separately when ready.",
	input: Schema.Struct({
		charter: Schema.String.annotate({
			description: "What the agent working this piece is to do, written for it to read.",
		}),
		dependsOn: DependsOn,
		expectation: Schema.String.annotate({
			description: "The expected result.",
		}),
		role: Schema.String.annotate({
			description: "The role the agent working this piece takes on.",
		}),
		title: Schema.String.annotate({
			description: "One line naming the piece.",
		}),
	}),
	name: "charter_piece",
});

export const launchPieceSpec = defineTool({
	description: "Release a Piece for dispatch when its dependencies and capacity allow. Returns without waiting for the work.",
	input: Schema.Struct({ pieceId: PieceId }),
	name: "launch_piece",
});

export const parkPieceSpec = defineTool({
	description: "Hold a Piece to prevent further dispatch until it is unparked.",
	input: Schema.Struct({ pieceId: PieceId }),
	name: "park_piece",
});

export const unparkPieceSpec = defineTool({
	description: "Release a parked Piece for dispatch again.",
	input: Schema.Struct({ pieceId: PieceId }),
	name: "unpark_piece",
});

export const rewirePieceSpec = defineTool({
	description: "Replace a Piece's dependencies. Cyclic dependencies are refused.",
	input: Schema.Struct({ dependsOn: DependsOn, pieceId: PieceId }),
	name: "rewire_piece",
});

export const readVoyageSpec = defineTool({
	description: "Read a Voyage's Pieces, progress, active agents and outcomes. Defaults to your Voyage.",
	input: Schema.Struct({
		voyageId: Schema.optional(
			Schema.String.annotate({
				description: "The Voyage ID. Omit for your own Voyage.",
			}),
		),
	}),
	name: "read_voyage",
});
