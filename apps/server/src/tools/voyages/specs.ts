import { defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { Schema } from "effect";

const backendField = (role: string) =>
	Schema.optional(
		Schema.String.annotate({
			description: `The backend the ${role} runs on, named as \`read_fleet\` names it. Omitted, the voyage takes the fleet's default.`,
		}),
	);

const modelField = (role: string) =>
	Schema.optional(
		Schema.String.annotate({
			description: `The model the ${role} runs, named as its backend names it. Omitted, the backend picks.`,
		}),
	);

const effortField = (role: string) =>
	Schema.optional(
		Schema.String.annotate({
			description: `How hard the ${role} thinks, named as its backend names it. Omitted, the backend picks.`,
		}),
	);

export const openVoyageSpec = defineTool({
	description:
		"Create a Voyage for an objective, with the backend, model and effort its captain and crew run on. Hail its captain separately to begin work.",
	input: Schema.Struct({
		captainBackend: backendField("captain"),
		captainEffort: effortField("captain"),
		captainModel: modelField("captain"),
		context: Schema.String.annotate({
			description: "Relevant background for the work.",
		}),
		crewBackend: backendField("crew"),
		crewEffort: effortField("crew"),
		crewModel: modelField("crew"),
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

export const readFleetSpec = defineTool({
	description: "List Voyages with their IDs, captains and progress, the registered repositories, and the models and efforts each backend offers.",
	input: Schema.Struct({}),
	name: "read_fleet",
});
