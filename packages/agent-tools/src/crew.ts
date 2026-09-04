import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const landReportSpec = defineTool({
	description: "Record findings or completed work as a Report for other agents, attached to your Piece.",
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
	description: "Land a Markdown result for the admiral by copying it from your moorage into durable storage.",
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
	description: "Mark an Artifact as the replacement for an older Artifact from the same Piece.",
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
	description: "Remove an incorrect Artifact replacement link. Both Artifacts are kept.",
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
	description: "Mark yourself idle when you have no work to do now. You remain available for messages.",
	input: Schema.Struct({}),
	name: "stand_down",
});
