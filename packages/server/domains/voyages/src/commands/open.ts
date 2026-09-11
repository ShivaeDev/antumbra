import { efforts } from "@antumbra/domain-backends/queries/efforts.ts";
import { models } from "@antumbra/domain-backends/queries/models.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, optional, titled } from "@antumbra/platform-feature/edit.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { VoyageKindSchema } from "@antumbra/platform-vocabulary/voyage.ts";
import { Clock, Effect, Schema } from "effect";
import { voyageOpened } from "#facts/voyage-opened.ts";
import { VoyageId } from "#ids.ts";

const NEEDS_NAME = "A voyage needs a name";

const NEEDS_NORTH_STAR = "A voyage needs a north star";

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
	run: Effect.fn("voyages.open")(function* (input, _rows, reject) {
		const name = input.name.trim();
		const northStar = input.northStar.trim();
		if (name === "") {
			return yield* reject.Blank({ field: "name", message: NEEDS_NAME });
		}
		if (northStar === "") {
			return yield* reject.Blank({ field: "northStar", message: NEEDS_NORTH_STAR });
		}
		const at = yield* Clock.currentTimeMillis;
		return {
			captain: { backend: input.captainBackend, effort: input.captainEffort, model: input.captainModel },
			context: input.context,
			crew: { backend: input.crewBackend, effort: input.crewEffort, model: input.crewModel },
			id: VoyageId.make(input.requestId),
			kind: input.kind,
			name,
			northStar,
			openedAt: new Date(at).toISOString(),
		};
	}),
});
