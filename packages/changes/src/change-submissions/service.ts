import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError, ChangeObservation } from "@antumbra/plugin-api";
import type {
	HeldResource,
	ResourceReclaimClaimed,
} from "@antumbra/resource-reclamation";
import type { StoredResourceReclaimStateInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Context, type Effect } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import type {
	ChangeIdentityCollision,
	ChangeObservationConflict,
} from "#change-submissions/errors.ts";
import type {
	AdoptChangeFailure,
	AdoptChangeInput,
	OpenChangeFailure,
	OpenChangeInput,
	SubmitChangeFailure,
	SubmitChangeInput,
} from "#change-submissions/model.ts";
import type {
	ChangeNotFound,
	ChangeStillAlive,
	StoredChangeInvalid,
	StoredChangeVerdictInvalid,
	StoredPieceChangeInvalid,
	UnknownChangeHostTag,
} from "#errors.ts";
import type { ChangeSnapshot } from "#snapshot.ts";

export class Changes extends Context.Service<
	Changes,
	{
		readonly adopt: (
			input: AdoptChangeInput,
		) => Effect.Effect<ChangeRow, AdoptChangeFailure>;
		// why: the admiral's terminal acknowledgement of a change that died at its
		// host. It settles what the change is still owed without deleting the
		// record of what happened to it.
		readonly dismiss: (
			changeId: string,
		) => Effect.Effect<void, ChangeNotFound | ChangeStillAlive | PrismaError>;
		readonly heldResources: (
			resources: ReadonlyArray<HeldResource>,
		) => Effect.Effect<
			ReadonlyMap<string, string>,
			| PrismaError
			| StoredChangeInvalid
			| StoredChangeVerdictInvalid
			| StoredPieceChangeInvalid,
			never
		>;
		readonly observed: (
			hostTag: string,
			observations: ReadonlyArray<ChangeObservation>,
		) => Effect.Effect<
			ReadonlyArray<ChangeRow>,
			| ChangeIdentityCollision
			| ChangeObservationConflict
			| PrismaError
			| ResourceReclaimClaimed
			| StoredChangeInvalid
			| StoredResourceReclaimStateInvalid
		>;
		readonly open: (
			input: OpenChangeInput,
		) => Effect.Effect<ChangeRow, OpenChangeFailure>;
		readonly refresh: (
			hostTag: string,
		) => Effect.Effect<
			ReadonlyArray<ChangeRow>,
			| ChangeHostError
			| ChangeIdentityCollision
			| ChangeObservationConflict
			| PrismaError
			| ResourceReclaimClaimed
			| StoredChangeInvalid
			| StoredResourceReclaimStateInvalid
			| UnknownChangeHostTag
		>;
		readonly snapshot: Effect.Effect<
			ChangeSnapshot,
			| PrismaError
			| StoredChangeInvalid
			| StoredChangeVerdictInvalid
			| StoredPieceChangeInvalid
		>;
		readonly submit: (
			input: SubmitChangeInput,
		) => Effect.Effect<ChangeRow, SubmitChangeFailure>;
		readonly watchable: (
			hostTag: string,
		) => Effect.Effect<
			ReadonlyArray<ChangeRow>,
			PrismaError | StoredChangeInvalid
		>;
	}
>()("@antumbra/changes/Changes") {}
