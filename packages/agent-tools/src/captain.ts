import { Schema } from "effect";
import { defineTool } from "#define.ts";

const PieceId = Schema.String.annotate({
	description: "The id of a piece on your voyage, as `read_voyage` shows it.",
});

const DependsOn = Schema.Array(Schema.String).annotate({
	description: "The ids of the pieces this one waits on. Empty means it waits on nothing.",
});

export const charterPieceSpec = defineTool({
	description:
		"Charter a piece of the voyage: a bounded unit of work with a stated outcome. Chartering does not start it — call `launch_piece` when you want it released into the pool.",
	input: Schema.Struct({
		charter: Schema.String.annotate({
			description: "What the agent working this piece is to do, written for it to read.",
		}),
		dependsOn: DependsOn,
		expectation: Schema.String.annotate({
			description: "The outcome you expect this piece to land. An estimate you may revise, not a contract.",
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
	description:
		"Release a chartered piece into the pool. It is dispatched once its dependencies are done and there is room in the fleet — you do not wait for it.",
	input: Schema.Struct({ pieceId: PieceId }),
	name: "launch_piece",
});

export const parkPieceSpec = defineTool({
	description: "Pull a piece back out of the pool: it stays chartered and stops being dispatched until you unpark it.",
	input: Schema.Struct({ pieceId: PieceId }),
	name: "park_piece",
});

export const unparkPieceSpec = defineTool({
	description: "Return a parked piece to the pool.",
	input: Schema.Struct({ pieceId: PieceId }),
	name: "unpark_piece",
});

export const rewirePieceSpec = defineTool({
	description: "Change what a piece waits on. The new set replaces the old one whole; a dependency that would close a loop is refused.",
	input: Schema.Struct({ dependsOn: DependsOn, pieceId: PieceId }),
	name: "rewire_piece",
});

export const readVoyageSpec = defineTool({
	description:
		"Read a voyage: its pieces and their state, who is at work, and what has landed. Call it whenever you need to know where the voyage stands. It reads the ship you are on unless you name another.",
	input: Schema.Struct({
		voyageId: Schema.optional(
			Schema.String.annotate({
				description: "The id of another voyage to read, as `read_fleet` shows it. Leave it out for the ship you are on.",
			}),
		),
	}),
	name: "read_voyage",
});
