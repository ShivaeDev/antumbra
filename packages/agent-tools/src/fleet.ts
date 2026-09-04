import { RulingUrgencySchema } from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const openVoyageSpec = defineTool({
	description: "Create a Voyage for an objective. Hail its captain separately to begin work.",
	input: Schema.Struct({
		context: Schema.String.annotate({
			description: "Relevant background for the work.",
		}),
		name: Schema.String.annotate({
			description: "One line naming the voyage.",
		}),
		northStar: Schema.String.annotate({
			description: "The enduring objective that guides the Voyage.",
		}),
	}),
	name: "open_voyage",
});

export const charterVoyagePieceSpec = defineTool({
	description: "Add a Piece to a named Voyage. It stays held until its captain launches it; hail the captain separately.",
	input: Schema.Struct({
		charter: Schema.String.annotate({
			description: "What the agent working this piece is to do, written for it to read.",
		}),
		expectation: Schema.String.annotate({
			description: "The expected result.",
		}),
		role: Schema.String.annotate({
			description: "The role the agent working this piece takes on.",
		}),
		title: Schema.String.annotate({
			description: "One line naming the piece.",
		}),
		voyageId: Schema.String.annotate({
			description: "The id of the voyage the piece is chartered on.",
		}),
	}),
	name: "charter_piece_on_voyage",
});

export const hailCaptainSpec = defineTool({
	description: "Reach a Voyage's existing captain, or create one if needed.",
	input: Schema.Struct({
		voyageId: Schema.String.annotate({
			description: "The id of the voyage whose captain is hailed.",
		}),
	}),
	name: "hail_captain",
});

export const proclaimRulingSpec = defineTool({
	description: "Record a new standing ruling that applies across the fleet.",
	input: Schema.Struct({
		answer: Schema.String.annotate({
			description: "The decision itself, in the words every voyage will read.",
		}),
		context: Schema.String.annotate({
			description: "The context needed to understand the decision.",
		}),
		question: Schema.String.annotate({
			description: "The question being answered.",
		}),
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description: "Topics that help other agents find the ruling.",
			}),
		),
		urgency: RulingUrgencySchema.annotate({
			description:
				"How badly the fleet needed this settled: `blocking` means work was held for it, `pressing` means work waits on it, `eventual` means nothing waited.",
		}),
	}),
	name: "proclaim_ruling",
});

export const readFleetSpec = defineTool({
	description: "List Voyages with their IDs, captains and progress to find the work you need.",
	input: Schema.Struct({}),
	name: "read_fleet",
});
