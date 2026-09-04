import { Schema } from "effect";
import { defineTool } from "#define.ts";

const Scope = Schema.Literals(["piece", "self", "voyage"]).annotate({
	description: "Whose board: `piece` is the piece you are working, `voyage` is the voyage it belongs to, `self` is your own.",
});

export const writeBoardSpec = defineTool({
	description: "Leave context and reasoning for the next agent. Omit what the work record already captures.",
	input: Schema.Struct({
		body: Schema.String.annotate({
			description: "The entry, written for whoever reads this board next.",
		}),
		scope: Scope,
	}),
	name: "write_board",
});

export const readMailSpec = defineTool({
	description: "Read your unread mail, oldest first. Reading does not mark it as read.",
	input: Schema.Struct({}),
	name: "read_mail",
});

export const markReadSpec = defineTool({
	description: "Mark mail as read after taking in its information.",
	input: Schema.Struct({
		entryIds: Schema.Array(Schema.String).annotate({
			description: "The ids returned by `read_mail` that you have taken in.",
		}),
	}),
	name: "mark_read",
});

export const readBoardSpec = defineTool({
	description: "Read earlier notes on a board before starting or resuming its work.",
	input: Schema.Struct({ scope: Scope }),
	name: "read_board",
});
