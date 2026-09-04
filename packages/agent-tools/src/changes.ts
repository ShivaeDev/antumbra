import { Schema } from "effect";
import { defineTool } from "#define.ts";

const Repo = Schema.String.annotate({
	description: "The repo name exactly as the Berths section spells it, not the berth folder's name.",
});

export const openChangeSpec = defineTool({
	description:
		"Open a change (pull request) for your piece from the branch of your berth in the named repo. Returns the change's id, url and stage. Opening is not landing: your piece completes when the change lands.",
	input: Schema.Struct({
		base: Schema.optionalKey(
			Schema.String.annotate({
				description: "The branch the change is proposed against. Leave it out for the repo's default.",
			}),
		),
		body: Schema.String.annotate({
			description: "What the change does and why, written for whoever reviews it.",
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
	description:
		"Submit the work in your berth as a durable prepared change for your piece. Repeated calls reuse that repo's active change. Returns its id and stage; a host pull request may attach later. Submission is not landing: the change remains pending until host evidence confirms acceptance.",
	input: Schema.Struct({ repo: Repo }),
	name: "submit_change",
});

export const adoptChangeSpec = defineTool({
	description:
		"Adopt a change that already exists: link it to your piece by its url, so the record knows your piece is waiting on it. Call it for a change you opened by hand rather than through `open_change`. Adoption is not landing: host evidence determines when it lands.",
	input: Schema.Struct({
		repo: Repo,
		url: Schema.String.annotate({
			description: "The change's url on its host.",
		}),
	}),
	name: "adopt_change",
});
