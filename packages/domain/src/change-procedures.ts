import type {
	ChangeIdentityCollision,
	ChangeObservationConflict,
} from "@antumbra/changes";
import {
	type AdoptChangeFailure,
	type AdoptChangeInput,
	type ChangeNotFound,
	type ChangeRow,
	type ChangeStillAlive,
	Changes,
	type OpenChangeFailure,
	type OpenChangeInput,
	type StoredChangeInvalid,
	type SubmitChangeFailure,
	type SubmitChangeInput,
	type UnknownChangeHostTag,
} from "@antumbra/changes";
import { DomainFeeds } from "@antumbra/domain-feeds";
import type { PrismaError } from "@antumbra/persistence";
import type {
	ChangeHost,
	ChangeHostError,
	ChangeObservation,
} from "@antumbra/plugin-api";
import type { StoredResourceReclaimStateInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Context, Effect, Layer, PubSub } from "effect";
import type { ResourceReclaimClaimed } from "#errors.ts";
import { type QuayReading, quayReading } from "#quay-view.ts";
import {
	type VoyageWorldReadFailure,
	VoyageWorldSource,
} from "#voyage-world.ts";

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
	// why: the verb a change closed without merging never had. It settles what
	// the change is owed and takes it off the quay without pretending it landed
	// and without forgetting that it existed.
	readonly dismiss: (
		changeId: string,
	) => Effect.Effect<void, ChangeNotFound | ChangeStillAlive | PrismaError>;
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
	readonly quay: Effect.Effect<QuayReading, VoyageWorldReadFailure>;
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

export class ChangeProcedureService extends Context.Service<
	ChangeProcedureService,
	ChangeProcedures
>()("@antumbra/domain/ChangeProcedures") {}

export const ChangeProceduresLive = (hosts: ReadonlyMap<string, ChangeHost>) =>
	Layer.effect(ChangeProcedureService)(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const submissions = yield* Changes;
			const world = yield* VoyageWorldSource;
			return ChangeProcedureService.of({
				adopt: submissions.adopt,
				capabilities: Effect.forEach([...hosts.values()], (host) =>
					Effect.map(host.capability, (capability) => ({
						available: capability.available,
						detail: capability.detail,
						tag: host.tag,
					})),
				),
				dismiss: submissions.dismiss,
				hostTags: [...hosts.keys()],
				observed: submissions.observed,
				open: submissions.open,
				quay: world.read.pipe(Effect.map(quayReading)),
				refresh: submissions.refresh,
				requestRefresh: PubSub.publish(feeds.changeRefresh, undefined),
				submit: submissions.submit,
				watchableChanges: submissions.watchable,
			});
		}),
	);
