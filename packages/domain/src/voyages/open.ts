import { type OpenVoyageInput, Voyages } from "@antumbra/voyages";
import { Effect } from "effect";

export const open = Effect.fn("VoyageProcedures.open")(function* (request: OpenVoyageInput) {
	const voyages = yield* Voyages;
	return yield* voyages.open(request);
});
