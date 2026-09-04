import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const landReportSpec = defineTool({
	description:
		"Land a report against your piece: prose for other agents — what you found, what you did, what is left. Call it once when your work is done, or whenever you have a finding worth handing on.",
	input: Schema.Struct({
		body: Schema.String.annotate({
			description: "The report itself, written for the agent who reads it next.",
		}),
		title: Schema.String.annotate({
			description: "One line naming what this report says.",
		}),
	}),
	name: "land_report",
});

export const landArtifactSpec = defineTool({
	description:
		"Land a Markdown artifact against your piece: a file in your moorage copied into immutable durable storage. Call it for every result a person should see.",
	input: Schema.Struct({
		path: Schema.String.annotate({
			description: "A relative path to a UTF-8 Markdown file in your moorage.",
		}),
		supersedesArtifactId: Schema.optional(
			Schema.String.annotate({
				description: "The known old Artifact this one replaces. Omit when it is not a revision.",
			}),
		),
		title: Schema.String.annotate({
			description: "One line naming what this artifact shows.",
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
	description: "Remove one known Artifact supersession relationship when correcting History. Artifact records remain unchanged.",
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
		"Say you have nothing left to do for now: crew once their work and outcomes are landed, captains when the voyage needs no action from them. This marks idleness, not Piece completion or retirement. You stay open and listening; Antumbra may later put you to rest at a safe boundary and wake you with the same identity when addressed.",
	input: Schema.Struct({}),
	name: "stand_down",
});
