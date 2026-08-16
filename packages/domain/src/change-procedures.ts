import type { PrismaError } from "@antumbra/persistence";
import type { ChangeHostError, ChangeObservation } from "@antumbra/plugin-api";
import { Effect, PubSub } from "effect";
import { applyObservations } from "#change-observe.ts";
import { openChangesOfHost } from "#change-read.ts";
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
import { type QuayReading, quayReading } from "#quay-view.ts";
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
	) => Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError>;
	readonly open: (
		input: OpenChangeInput,
	) => Effect.Effect<ChangeRow, OpenChangeFailure>;
	// why: what is still waiting on a host, which is both what a pass asks
	// about and what decides how soon the next pass is worth making.
	readonly openChanges: (
		hostTag: string,
	) => Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError>;
	// why: every change still owed, read across the whole fleet and grouped by
	// where it lies, beside the pieces one made by hand can be adopted onto.
	readonly quay: Effect.Effect<QuayReading, PrismaError>;
	readonly refresh: (
		hostTag: string,
	) => Effect.Effect<
		ReadonlyArray<ChangeRow>,
		ChangeHostError | PrismaError | UnknownChangeHostTag
	>;
	// why: the same ring an opened change gives, offered to whoever else wants
	// to stop waiting — a window's refresh button, an agent that knows something
	// happened. It asks; the cadence still decides what a pass costs.
	readonly requestRefresh: Effect.Effect<void>;
}

export const makeChangeProcedures = (deps: AgentDeps): ChangeProcedures => ({
	adopt: (input) => adoptChange(deps, input),
	capabilities: Effect.forEach([...deps.changeHosts.values()], (host) =>
		Effect.map(host.capability, (capability) => ({
			available: capability.available,
			detail: capability.detail,
			tag: host.tag,
		})),
	),
	hostTags: [...deps.changeHosts.keys()],
	observed: (hostTag, observations) =>
		applyObservations(deps, hostTag, observations),
	open: (input) => openChange(deps, input),
	openChanges: (hostTag) => openChangesOfHost(deps, hostTag),
	quay: readVoyageWorld(deps).pipe(Effect.map(quayReading)),
	refresh: (hostTag) => refreshChanges(deps, hostTag),
	requestRefresh: PubSub.publish(deps.feeds.changeRefresh, undefined),
});
