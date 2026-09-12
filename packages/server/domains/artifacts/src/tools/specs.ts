import { defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { Schema } from "effect";
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
