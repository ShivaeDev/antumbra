import { Schema } from "effect";
import { defineTool } from "#define.ts";

// why: descriptions are written for the model that reads them — imperative,
// and saying when to call, because a tool the agent cannot place is a tool it
// never reaches for.

export const landReportSpec = defineTool({
	description:
		"Land a report against your piece: prose for other agents — what you found, what you did, what is left. Call it once when your work is done, or whenever you have a finding worth handing on.",
	input: Schema.Struct({
		body: Schema.String.annotate({
			description:
				"The report itself, written for the agent who reads it next.",
		}),
		title: Schema.String.annotate({
			description: "One line naming what this report says.",
		}),
	}),
	name: "land_report",
});

export const landArtifactSpec = defineTool({
	description:
		"Land an artifact against your piece: something to look at rather than read — a file in your moorage, copied into durable storage, or an external URL. Call it for every result a person should see.",
	input: Schema.Struct({
		title: Schema.String.annotate({
			description: "One line naming what this artifact shows.",
		}),
		uri: Schema.String.annotate({
			description: "A path inside your moorage, or an http(s) URL.",
		}),
	}),
	name: "land_artifact",
});

export const standDownSpec = defineTool({
	description:
		"Ask Antumbra to stand you down once your work is done and everything is landed. Antumbra accepts the request before detaching execution and preserves your Agent identity for later hails or work assignments.",
	input: Schema.Struct({}),
	name: "stand_down",
});
