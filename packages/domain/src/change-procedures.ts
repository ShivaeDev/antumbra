import type {
	StoredAgentSessionStatusInvalid,
	StoredAgentStatusInvalid,
	StoredResourceReclaimStateInvalid,
} from "@antumbra/agent-runtime-vocabulary";
import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError, ChangeObservation } from "@antumbra/plugin-api";
import { Effect, PubSub } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import {
	type AdoptChangeFailure,
	type AdoptChangeInput,
	ChangeSubmissions,
	type SubmitChangeFailure,
	type SubmitChangeInput,
} from "#change-submissions/change-submissions.ts";
import type {
	ChangeIdentityCollision,
	ChangeObservationConflict,
} from "#change-submissions/errors.ts";
import type { OpenChangeFailure, OpenChangeInput } from "#changes.ts";
import type { AgentDeps } from "#deps.ts";
import type {
	ResourceReclaimClaimed,
	StoredChangeInvalid,
	StoredPieceChangeInvalid,
	UnknownChangeHostTag,
} from "#errors.ts";
import { type QuayReading, quayReading } from "#quay-view.ts";
import type { InvalidSessionExecutionStatus } from "#session-execution-status.ts";
import { readVoyageWorld } from "#voyage-world.ts";

// why: what a host can do right now, said in the host's own words — the window
// shows it, and a tool that cannot act says the same sentence back to the
// agent, so both read the same answer rather than two paraphrases of it.
export interface ChangeHostCapabilityView {
	readonly available: boolean;
	readonly detail: string;
	readonly tag: string;
}

export interface ChangeProcedures {
	readonly adopt: (
		input: AdoptChangeInput,
	) => Effect.Effect<ChangeRow, AdoptChangeFailure>;
	readonly capabilities: Effect.Effect<ReadonlyArray<ChangeHostCapabilityView>>;
	readonly hostTags: ReadonlyArray<string>;
	// why: the seam a host that pushes reaches, beside the one a host that is
	// polled reaches — both hand the domain the same neutral observations.
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
	readonly submit: (
		input: SubmitChangeInput,
	) => Effect.Effect<ChangeRow, SubmitChangeFailure>;
	// why: what can still change at a host — open changes can settle and
	// withdrawn ones can reopen. The set also decides the next pass cadence.
	readonly watchableChanges: (
		hostTag: string,
	) => Effect.Effect<
		ReadonlyArray<ChangeRow>,
		PrismaError | StoredChangeInvalid
	>;
	// why: every change still owed, read across the whole fleet and grouped by
	// where it lies, beside the pieces one made by hand can be adopted onto.
	readonly quay: Effect.Effect<
		QuayReading,
		| InvalidSessionExecutionStatus
		| PrismaError
		| StoredAgentSessionStatusInvalid
		| StoredAgentStatusInvalid
		| StoredChangeInvalid
		| StoredPieceChangeInvalid
	>;
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
	// why: the same ring an opened change gives, offered to whoever else wants
	// to stop waiting — a window's refresh button, an agent that knows something
	// happened. It asks; the cadence still decides what a pass costs.
	readonly requestRefresh: Effect.Effect<void>;
}

export const makeChangeProcedureCompiler = Effect.gen(function* () {
	const submissions = yield* ChangeSubmissions;
	function makeChangeProcedures(deps: AgentDeps): ChangeProcedures {
		return {
			adopt: submissions.adopt,
			capabilities: Effect.forEach([...deps.changeHosts.values()], (host) =>
				Effect.map(host.capability, (capability) => ({
					available: capability.available,
					detail: capability.detail,
					tag: host.tag,
				})),
			),
			hostTags: [...deps.changeHosts.keys()],
			observed: submissions.observed,
			open: submissions.open,
			submit: submissions.submit,
			watchableChanges: submissions.watchable,
			quay: readVoyageWorld(deps).pipe(Effect.map(quayReading)),
			refresh: submissions.refresh,
			requestRefresh: PubSub.publish(deps.feeds.changeRefresh, undefined),
		};
	}
	return makeChangeProcedures;
});
