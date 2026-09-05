import { Schema } from "effect";
import { defineTool } from "#define.ts";

const Repo = Schema.String.annotate({
	description: "The repo name exactly as the Berths section spells it, not the berth folder's name.",
});

export const openChangeSpec = defineTool({
	description: "Publish your berth's branch as a pull request for this Piece.",
	input: Schema.Struct({
		base: Schema.optionalKey(
			Schema.String.annotate({
				description: "The branch the change is proposed against. Leave it out for the repo's default.",
			}),
		),
		body: Schema.String.annotate({
			description:
				"The pull request body, written for a busy maintainer who was not in the session. Four sections in this order. `### Why?` is the product story: the problem that started the work, the goal, and why it matters. `### How?` is the bird's-eye view of the approach for a technical reader: what was built, how the parts fit, and where it sits in the product, at the level that lets them trust the diff before opening it. `### Decisions` only when the work made a major trade-off: one bullet each, with the reason. `### Callouts` only when a spot needs a close look: one bullet each, with what to look for. Give Why and How the length the work needs, in short paragraphs, one idea per sentence, active voice. Use a table when items compare or line up, and a Mermaid diagram when the change is a flow or a set of connected parts. Leave out file lists, test plans, risk speculation, diff narration, and pointers to reports, boards, paths or servers the reader cannot open. This format applies in every repository.",
		}),
		draft: Schema.optionalKey(
			Schema.Boolean.annotate({
				description: "True while the change is not ready to be reviewed. Defaults to false.",
			}),
		),
		repo: Repo,
		title: Schema.String.annotate({
			description:
				"One line that names the change by its effect on the product or on the people who use it, in the present tense, like a release note. Spend every word on the effect; a type prefix such as fix: and a verb such as improve, update or clean up carry no information.",
		}),
	}),
	name: "open_change",
});

export const submitChangeSpec = defineTool({
	description: "Record the work in your berth as a prepared Change for this Piece.",
	input: Schema.Struct({ repo: Repo }),
	name: "submit_change",
});

export const adoptChangeSpec = defineTool({
	description: "Link an existing pull request to this Piece by URL.",
	input: Schema.Struct({
		repo: Repo,
		url: Schema.String.annotate({
			description: "The change's url on its host.",
		}),
	}),
	name: "adopt_change",
});
