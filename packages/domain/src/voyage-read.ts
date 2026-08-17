import type {
	StoredAgentSessionStatusInvalid,
	StoredAgentStatusInvalid,
} from "@antumbra/agent-runtime-vocabulary";
import type { PrismaError } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { StoredChangeInvalid, StoredPieceChangeInvalid } from "#errors.ts";
import type { InvalidSessionExecutionStatus } from "#session-execution-status.ts";
import { type VoyageView, voyageView } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export const readVoyageView = (
	voyageId: string,
): Effect.Effect<
	Option.Option<VoyageView>,
	| InvalidSessionExecutionStatus
	| PrismaError
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid
	| StoredChangeInvalid
	| StoredPieceChangeInvalid,
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
