import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const requestApprovalSpec = defineTool({
	description:
		"Ask the admiral to approve your plot. The plot is every piece on your voyage that is neither parked nor abandoned, so park what should not sail before you ask. Returns at once; the admiral's answer, approve or redirect with their words, reaches you as mail.",
	input: Schema.Struct({
		context: Schema.String.annotate({
			description: "Why these pieces, in this shape, now. The admiral reads it beside the piece titles.",
		}),
	}),
	name: "request_approval",
});
