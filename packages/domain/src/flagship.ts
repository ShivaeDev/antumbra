import { Voyages } from "@antumbra/voyages";
import { Effect, Layer } from "effect";

export const FlagshipLive = Layer.effectDiscard(
	Effect.flatMap(Voyages, (voyages) =>
		voyages.ensureFlagship({
			context: "Fleet-level rulings and findings belong here.",
			name: "Flagship",
			northStar: "The fleet sails well.",
		}),
	),
);
