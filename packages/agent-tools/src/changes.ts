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
				"Four sections, written for a reviewer who was not in the session. `### Why?` and `### How?` are the valuable ones and are never held to a sentence count; give each the length the difficulty of the work and the explanation it needs. Why is the product side: the problem that started the work, the goal, and why anyone cared. How is the approach at a high level for a technical reader, product as well as code. Write each as short paragraphs with line breaks between them, telling the story in order rather than in one flowing blob. `### Decisions` lists the major trade-offs, one bullet each; ten bullets means you have gone well past the major ones. `### Callouts` lists the spots a reviewer should look at closely, one bullet each. Leave either section out when there is none. The body stands on its own: the reviewer sees no report of yours, no board and no machine you worked on, so put the thing in the body instead of pointing at where it lives. No file lists, test plans or diff narration.",
		}),
		draft: Schema.optionalKey(
			Schema.Boolean.annotate({
				description: "True while the change is not ready to be reviewed. Defaults to false.",
			}),
		),
		repo: Repo,
		title: Schema.String.annotate({
			description: "One line naming what the change does.",
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
