import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const requestApprovalSpec = defineTool({
	description:
		"Put the plot as it stands in front of the admiral. The piece set is not typed: it is every piece on your voyage that is neither parked nor abandoned, so park what you do not want approved before you ask. The request lands durably and this call returns at once; the admiral answers with approve or redirect and words beside either, and the answer reaches you as mail. Approving supersedes the plot approved before it, so exactly one approved set stands per voyage. Refused while an earlier request on this voyage is unanswered, when the set is empty, and when the set is exactly what already stands approved.",
	input: Schema.Struct({
		context: Schema.String.annotate({
			description:
				"The plot: why these pieces, in this shape, now. The admiral reads it beside the piece titles, so say what a reader who was not here needs.",
		}),
	}),
	name: "request_approval",
});
