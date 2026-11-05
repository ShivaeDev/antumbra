import { FLAGSHIP_REQUEST } from "@antumbra/domain-voyages/ids.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Effect } from "effect";

const flagship = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "Fleet-level rulings and findings belong here.",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "flagship",
	name: "Flagship",
	northStar: "The fleet sails well.",
	requestId: FLAGSHIP_REQUEST,
} as const;

export const openFlagship = Effect.gen(function* () {
	const voyagesService = yield* Voyages;

	yield* voyagesService.open(flagship).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.orDie,
	);
});
