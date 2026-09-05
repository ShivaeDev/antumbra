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
				"What the change does and why, written for whoever reviews it. Say what you decided and why under `### Decisions`, and what a reviewer should look at closely under `### Callouts`.",
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
