import type { PrismaError } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { AgentDeps } from "#deps.ts";
import type { StoredChangeInvalid, StoredPieceChangeInvalid } from "#errors.ts";
import { type VoyageView, voyageView } from "#voyage-view.ts";
import { readVoyageWorld } from "#voyage-world.ts";

export const readVoyageView = (
	deps: AgentDeps,
	voyageId: string,
): Effect.Effect<
	Option.Option<VoyageView>,
	PrismaError | StoredChangeInvalid | StoredPieceChangeInvalid
> =>
	readVoyageWorld(deps).pipe(
		Effect.map((world) =>
			Option.map(
				Option.fromUndefinedOr(
					world.voyages.find((voyage) => voyage.id === voyageId),
				),
				(voyage) => voyageView(world, voyage),
			),
		),
	);
