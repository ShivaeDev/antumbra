import { Effect, Option } from "effect";
import { voyageView } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export const readVoyageView = Effect.fn("Voyages.read")(function* (voyageId: string) {
	const source = yield* VoyageWorldSource;
	const world = yield* source.read();
	return Option.map(Option.fromUndefinedOr(world.voyages.find((voyage) => voyage.id === voyageId)), (voyage) => voyageView(world, voyage));
});
