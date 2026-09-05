import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { Voyages } from "@antumbra/voyages";
import { Effect, Layer } from "effect";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

export const FlagshipLive = Layer.effectDiscard(
	Effect.flatMap(Voyages, (voyages) =>
		voyages.ensureFlagship({
			backend: FIRST_BACKEND,
			context: "Fleet-level rulings and findings belong here.",
			name: "Flagship",
			northStar: "The fleet sails well.",
		}),
	),
);
