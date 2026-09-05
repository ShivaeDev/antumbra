import { Effect, Option } from "effect";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { voyageView } from "#voyage-view.ts";

export const readVoyageView = Effect.fn("Voyages.read")(function* (voyageId: string) {
	const details = yield* VoyageDetails;
	return Option.map(yield* details.read(voyageId), ({ rows, voyage }) => voyageView(rows, voyage));
});
