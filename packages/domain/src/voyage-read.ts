import { Effect, Option } from "effect";
import { type VoyageView, voyageView } from "#voyage-view.ts";
import {
	type VoyageWorldReadFailure,
	VoyageWorldSource,
} from "#voyage-world.ts";

export const readVoyageView = (
	voyageId: string,
): Effect.Effect<
	Option.Option<VoyageView>,
	VoyageWorldReadFailure,
	VoyageWorldSource
> =>
	Effect.flatMap(VoyageWorldSource, (source) => source.read).pipe(
		Effect.map((world) =>
			Option.map(
				Option.fromUndefinedOr(
					world.voyages.find((voyage) => voyage.id === voyageId),
				),
				(voyage) => voyageView(world, voyage),
			),
		),
	);
