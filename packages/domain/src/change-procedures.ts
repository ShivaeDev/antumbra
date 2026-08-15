import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError, ChangeObservation } from "@antumbra/plugin-api";
import type { Effect } from "effect";
import { applyObservations } from "#change-observe.ts";
import { refreshChanges } from "#change-refresh.ts";
import type { ChangeRow } from "#change-rows.ts";
import {
	type AdoptChangeFailure,
	type AdoptChangeInput,
	adoptChange,
	type OpenChangeFailure,
	type OpenChangeInput,
	openChange,
} from "#changes.ts";
import type { AgentDeps } from "#deps.ts";
import type { UnknownChangeHostTag } from "#errors.ts";

export interface ChangeProcedures {
	readonly adopt: (
		input: AdoptChangeInput,
	) => Effect.Effect<ChangeRow, AdoptChangeFailure>;
	// why: the seam a host that pushes reaches, beside the one a host that is
	// polled reaches — both hand the domain the same neutral observations.
	readonly observed: (
		hostTag: string,
		observations: ReadonlyArray<ChangeObservation>,
	) => Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError>;
	readonly open: (
		input: OpenChangeInput,
	) => Effect.Effect<ChangeRow, OpenChangeFailure>;
	readonly refresh: (
		hostTag: string,
	) => Effect.Effect<
		ReadonlyArray<ChangeRow>,
		ChangeHostError | PrismaError | UnknownChangeHostTag
	>;
}

export const makeChangeProcedures = (deps: AgentDeps): ChangeProcedures => ({
	adopt: (input) => adoptChange(deps, input),
	observed: (hostTag, observations) =>
		applyObservations(deps, hostTag, observations),
	open: (input) => openChange(deps, input),
	refresh: (hostTag) => refreshChanges(deps, hostTag),
});
