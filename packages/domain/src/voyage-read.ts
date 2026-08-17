import type {
	StoredAgentSessionStatusInvalid,
	StoredAgentStatusInvalid,
} from "@antumbra/agent-runtime-vocabulary";
import type { PrismaError } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { AgentDeps } from "#deps.ts";
import type { StoredChangeInvalid, StoredPieceChangeInvalid } from "#errors.ts";
import type { InvalidSessionExecutionStatus } from "#session-execution-status.ts";
import { type VoyageView, voyageView } from "#voyage-view.ts";
import { readVoyageWorld } from "#voyage-world.ts";

export const readVoyageView = (
	deps: AgentDeps,
	voyageId: string,
): Effect.Effect<
	Option.Option<VoyageView>,
	| InvalidSessionExecutionStatus
	| PrismaError
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid
	| StoredChangeInvalid
	| StoredPieceChangeInvalid
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
