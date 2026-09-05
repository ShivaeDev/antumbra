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
				"Written for a reviewer who was not in the session, in four headed sections: `### Why?` states the problem in one to three sentences, `### How?` states the approach in one or two, `### Decisions` gives one bullet per tradeoff you made and why, and `### Callouts` gives one bullet per spot a reviewer should look at closely. Leave the last two out when there is none. Evidence you gathered belongs in a Report the body points at. No file lists, test plans or diff narration.",
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
