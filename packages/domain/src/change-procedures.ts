import type { ChangeIdentityCollision, ChangeObservationConflict } from "@antumbra/changes";
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
import type { ChangeHost, ChangeHostError, ChangeObservation } from "@antumbra/plugin-api";
import type { StoredResourceReclaimStateInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Context, Effect, Layer } from "effect";
import type { ResourceReclaimClaimed } from "#errors.ts";
import { type QuayReading, quayReading } from "#quay-view.ts";
import { type VoyageWorldReadFailure, VoyageWorldSource } from "#voyage-world.ts";

export interface ChangeHostCapabilityView {
	readonly available: boolean;
	readonly detail: string;
	readonly tag: string;
}

export interface ChangeProcedures {
	readonly adopt: (input: AdoptChangeInput) => Effect.Effect<ChangeRow, AdoptChangeFailure>;
	readonly capabilities: Effect.Effect<ReadonlyArray<ChangeHostCapabilityView>>;
	readonly dismiss: (changeId: string) => Effect.Effect<void, ChangeNotFound | ChangeStillAlive | PrismaError>;
	readonly hostTags: ReadonlyArray<string>;
	// Push and polling adapters report the same neutral observations through this boundary.
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
	readonly open: (input: OpenChangeInput) => Effect.Effect<ChangeRow, OpenChangeFailure>;
	readonly submit: (input: SubmitChangeInput) => Effect.Effect<ChangeRow, SubmitChangeFailure>;
	readonly watchableChanges: (hostTag: string) => Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError | StoredChangeInvalid>;
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
	readonly requestRefresh: Effect.Effect<void>;
}

export class ChangeProcedureService extends Context.Service<ChangeProcedureService, ChangeProcedures>()("@antumbra/domain/ChangeProcedures") {}

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
				requestRefresh: feeds.publishChangeRefresh(),
				submit: submissions.submit,
				watchableChanges: submissions.watchable,
			});
		}),
	);
