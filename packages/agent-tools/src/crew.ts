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
		supersedesArtifactId: Schema.optional(
			Schema.String.annotate({
				description:
					"The known old Artifact this one replaces. Omit when it is not a revision.",
			}),
		),
		title: Schema.String.annotate({
			description: "One line naming what this artifact shows.",
		}),
		uri: Schema.String.annotate({
			description: "A path inside your moorage, or an http(s) URL.",
		}),
	}),
	name: "land_artifact",
});

export const supersedeArtifactSpec = defineTool({
	description:
		"Make one Artifact the successor of an older Artifact from the same piece. Call it only when you know the relationship; Antumbra never infers revisions or duplicates.",
	input: Schema.Struct({
		successorArtifactId: Schema.String.annotate({
			description: "The Artifact that is now current.",
		}),
		supersededArtifactId: Schema.String.annotate({
			description: "The older Artifact being moved to History.",
		}),
	}),
	name: "supersede",
});

export const removeArtifactSupersessionSpec = defineTool({
	description:
		"Remove one known Artifact supersession relationship when correcting History. Artifact records remain unchanged.",
	input: Schema.Struct({
		successorArtifactId: Schema.String.annotate({
			description: "The current successor in the relationship.",
		}),
		supersededArtifactId: Schema.String.annotate({
			description: "The predecessor in History.",
		}),
	}),
	name: "remove_supersession",
});

export const standDownSpec = defineTool({
	description:
		"Ask Antumbra to stand you down once your work is done and everything is landed. Antumbra accepts the request before detaching execution and preserves your Agent identity for later hails or work assignments.",
	input: Schema.Struct({}),
	name: "stand_down",
});
