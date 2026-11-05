import { efforts } from "@antumbra/domain-backends/queries/efforts.ts";
import { models } from "@antumbra/domain-backends/queries/models.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, optional, titled } from "@antumbra/platform-feature/edit.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { VoyageKindSchema } from "@antumbra/platform-vocabulary/voyage.ts";
import { Schema } from "effect";
import { voyageOpened } from "#facts/voyage-opened.ts";

export const open = command("open", {
	input: {
		name: titled(Schema.String, { title: "Name" }),
		northStar: titled(Schema.String, { title: "North star" }),
		context: titled(Schema.String, { multiline: true, title: "Context" }),
		kind: VoyageKindSchema,
		captainBackend: optional(Schema.Literals(AGENT_BACKEND_TAGS), { title: "Captain backend" }),
		captainModel: optional(choice(models, { free: true, input: { backend: "captainBackend" }, label: "name", value: "model" }), {
			title: "Captain model",
		}),
		captainEffort: optional(choice(efforts, { free: true, input: { backend: "captainBackend", model: "captainModel" } }), {
			title: "Captain effort",
		}),
		crewBackend: optional(Schema.Literals(AGENT_BACKEND_TAGS), { title: "Crew backend" }),
		crewModel: optional(choice(models, { free: true, input: { backend: "crewBackend" }, label: "name", value: "model" }), { title: "Crew model" }),
		crewEffort: optional(choice(efforts, { free: true, input: { backend: "crewBackend", model: "crewModel" } }), { title: "Crew effort" }),
	},
	reads: [],
	emits: voyageOpened,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
});
