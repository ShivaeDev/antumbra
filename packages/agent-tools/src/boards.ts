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
	description: "Read your unread mail, oldest first, when a wake says mail is waiting or when you start work. Reading does not mark it as read.",
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
	description:
		"Read a board before starting or resuming its work. You get a summary for each stretch that has been smoothed and every note since in full. Name a summary to read the notes behind it instead.",
	input: Schema.Struct({
		scope: Scope,
		summaryId: Schema.optional(
			Schema.String.annotate({
				description: "The id of a summary this board already showed you. Its own notes come back in place of the board.",
			}),
		),
	}),
	name: "read_board",
});

export const writeSummarySpec = defineTool({
	description: "Write the summary of the entries you were given. Call it once, with the whole summary.",
	input: Schema.Struct({
		text: Schema.String.annotate({
			description: "The summary, as plain paragraphs.",
		}),
	}),
	name: "write_summary",
});
