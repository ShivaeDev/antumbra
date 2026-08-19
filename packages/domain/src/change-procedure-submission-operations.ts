import {
	type AdoptChangeFailure,
	type AdoptChangeInput,
	type ChangeIdentityCollision,
	type ChangeObservationConflict,
	type ChangeRow,
	Changes,
	type OpenChangeFailure,
	type OpenChangeInput,
	type StoredChangeInvalid,
	type SubmitChangeFailure,
	type SubmitChangeInput,
	type UnknownChangeHostTag,
} from "@antumbra/changes";
import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError, ChangeObservation } from "@antumbra/plugin-api";
import type { StoredResourceReclaimStateInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import type { ChangeProcedureRequirements } from "#change-procedure-requirements.ts";
import type { ResourceReclaimClaimed } from "#errors.ts";

export const adopt = Effect.fn("changeProcedures.adopt")(function* (
	input: AdoptChangeInput,
): ChangeProcedureRequirements<ChangeRow, AdoptChangeFailure> {
	return yield* (yield* Changes).adopt(input);
});

// why: the seam a host that pushes reaches, beside the one a host that is
// polled reaches — both hand the domain the same neutral observations.
export const observed = Effect.fn("changeProcedures.observed")(function* (
	hostTag: string,
	observations: ReadonlyArray<ChangeObservation>,
): ChangeProcedureRequirements<
	ReadonlyArray<ChangeRow>,
	| ChangeIdentityCollision
	| ChangeObservationConflict
	| PrismaError
	| ResourceReclaimClaimed
	| StoredChangeInvalid
	| StoredResourceReclaimStateInvalid
> {
	return yield* (yield* Changes).observed(hostTag, observations);
});

export const open = Effect.fn("changeProcedures.open")(function* (
	input: OpenChangeInput,
): ChangeProcedureRequirements<ChangeRow, OpenChangeFailure> {
	return yield* (yield* Changes).open(input);
});

export const refresh = Effect.fn("changeProcedures.refresh")(function* (
	hostTag: string,
): ChangeProcedureRequirements<
	ReadonlyArray<ChangeRow>,
	| ChangeHostError
	| ChangeIdentityCollision
	| ChangeObservationConflict
	| PrismaError
	| ResourceReclaimClaimed
	| StoredChangeInvalid
	| StoredResourceReclaimStateInvalid
	| UnknownChangeHostTag
> {
	return yield* (yield* Changes).refresh(hostTag);
});

export const submit = Effect.fn("changeProcedures.submit")(function* (
	input: SubmitChangeInput,
): ChangeProcedureRequirements<ChangeRow, SubmitChangeFailure> {
	return yield* (yield* Changes).submit(input);
});

// why: what can still change at a host — open changes can settle and
// withdrawn ones can reopen. The set also decides the next pass cadence.
export const watchableChanges = Effect.fn("changeProcedures.watchableChanges")(
	function* (
		hostTag: string,
	): ChangeProcedureRequirements<
		ReadonlyArray<ChangeRow>,
		PrismaError | StoredChangeInvalid
	> {
		return yield* (yield* Changes).watchable(hostTag);
	},
);
