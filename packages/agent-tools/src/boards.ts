import { Schema } from "effect";
import { defineTool } from "#define.ts";

const Scope = Schema.Literals(["piece", "self", "voyage"]).annotate({
	description:
		"Whose board: `piece` is the piece you are working, `voyage` is the voyage it belongs to, `self` is your own.",
});

export const writeBoardSpec = defineTool({
	description:
		"Write an entry on a board, so what you learned outlives your session. The smooth register is for what a successor must know; the rough register is scratch. Never write what the record already holds — landed outcomes are their own account.",
	input: Schema.Struct({
		body: Schema.String.annotate({
			description: "The entry, written for whoever reads this board next.",
		}),
		register: Schema.Literals(["rough", "smooth"]).annotate({
			description:
				"`smooth` for distilled learnings that stay true, `rough` for high-volume scratch.",
		}),
		scope: Scope,
	}),
	name: "write_board",
});

export const readBoardSpec = defineTool({
	description:
		"Read a board, oldest entry first: what earlier sessions left for whoever came next. Call it before you start, so you do not redo what someone already settled.",
	input: Schema.Struct({ scope: Scope }),
	name: "read_board",
});
