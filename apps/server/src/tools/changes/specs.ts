import { defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { Schema } from "effect";

const Repo = Schema.String.annotate({
	description: "The repo name exactly as the Berths section spells it, not the berth folder's name.",
});

export const openChangeSpec = defineTool({
	description:
		"Open the change for this piece as a pull request from the branch your berth is on. This is the only way to open a pull request; never open one with `gh` or the GitHub UI. Write the title and body as the `pr-description` skill says.",
	input: Schema.Struct({
		base: Schema.optionalKey(
			Schema.String.annotate({
				description: "The branch the change is proposed against. Leave it out for the repo's default.",
			}),
		),
		body: Schema.String.annotate({
			description: "The pull request body: Why, How, and optionally Decisions and Callouts.",
		}),
		draft: Schema.optionalKey(
			Schema.Boolean.annotate({
				description: "True while the change is not ready to be reviewed. Defaults to false.",
			}),
		),
		repo: Repo,
		title: Schema.String.annotate({
			description: "The pull request title: one line naming the change by its effect, in the present tense.",
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
