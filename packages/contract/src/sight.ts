import {
	ResourceReclaimStateSchema,
	SessionPresenceSchema,
} from "@antumbra/vocabulary/agent-runtime";
import { HistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Data, type Effect, Schema, type Stream } from "effect";
import type { SessionTree } from "#session-tree.ts";
import {
	AgentDiagnostics,
	FleetDiagnostics,
	SessionDiagnostics,
} from "#sight-diagnostics.ts";

export const SessionSummary = Schema.Struct({
	backend: Schema.String,
	canInterrupt: Schema.Boolean,
	// why: whether the admiral's words can reach this Session now, published as
	// a capability so no affordance is ever derived from raw execution state.
	canSend: Schema.Boolean,
	cwd: Schema.String,
	diag: SessionDiagnostics,
	id: Schema.String,
	// why: what the Session is doing about being spoken to, curated by the
	// domain so a view never has to read execution state to word a footer. It
	// stands beside the capabilities rather than replacing them: presence says
	// what a reader is looking at, `canSend` says what they may do.
	presence: SessionPresenceSchema,
	status: Schema.String,
});
export type SessionSummary = typeof SessionSummary.Type;

export const BerthSummary = Schema.Struct({
	branch: Schema.String,
	reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
	slug: Schema.String,
	status: Schema.String,
});
export type BerthSummary = typeof BerthSummary.Type;

export const AgentSummary = Schema.Struct({
	berths: Schema.Array(BerthSummary),
	charter: Schema.String,
	diag: AgentDiagnostics,
	id: Schema.String,
	role: Schema.String,
	sessions: Schema.Array(SessionSummary),
	status: Schema.String,
});
export type AgentSummary = typeof AgentSummary.Type;

export const RepoSummary = Schema.Struct({
	defaultRef: Schema.String,
	id: Schema.String,
	name: Schema.String,
	source: Schema.String,
});
export type RepoSummary = typeof RepoSummary.Type;

// why: the fleet carries what every spawn is made of — the backends the host
// registered and the repos every agent is moored to. The renderer offers
// these, never a list of its own.
export const Fleet = Schema.Struct({
	agents: Schema.Array(AgentSummary),
	backends: Schema.Array(Schema.String),
	diag: FleetDiagnostics,
	repos: Schema.Array(RepoSummary),
});
export type Fleet = typeof Fleet.Type;

export const SessionEvent = Schema.Struct({
	event: HistoricalAgentEvent,
	seq: Schema.Number,
	sessionId: Schema.String,
});
export type SessionEvent = typeof SessionEvent.Type;

export const EventQuery = Schema.Struct({
	fromSeq: Schema.Number,
	sessionId: Schema.String,
});
export type EventQuery = typeof EventQuery.Type;

export const RepoRegistration = Schema.Struct({
	defaultRef: Schema.String,
	source: Schema.String,
});
export type RepoRegistration = typeof RepoRegistration.Type;

export const SpawnRequest = Schema.Struct({
	backend: Schema.String,
	charter: Schema.String,
	role: Schema.String,
});
export type SpawnRequest = typeof SpawnRequest.Type;

export const SpawnReceipt = Schema.Struct({
	agentId: Schema.String,
	sessionId: Schema.String,
});
export type SpawnReceipt = typeof SpawnReceipt.Type;

export class SightFailure extends Data.TaggedError("SightFailure")<{
	readonly message: string;
}> {}

export class SightSource extends Context.Service<
	SightSource,
	{
		readonly fleet: Effect.Effect<Fleet, SightFailure>;
		readonly fleetFeed: Stream.Stream<Fleet, SightFailure>;
		readonly forgetRepo: (repoId: string) => Effect.Effect<void, SightFailure>;
		readonly interrupt: (
			sessionId: string,
		) => Effect.Effect<void, SightFailure>;
		readonly registerRepo: (
			registration: RepoRegistration,
		) => Effect.Effect<RepoSummary, SightFailure>;
		readonly retire: (agentId: string) => Effect.Effect<void, SightFailure>;
		readonly send: (
			sessionId: string,
			text: string,
		) => Effect.Effect<void, SightFailure>;
		readonly sessionEventFeed: (
			query: EventQuery,
		) => Stream.Stream<SessionEvent, SightFailure>;
		readonly sessionEvents: (
			query: EventQuery,
		) => Effect.Effect<ReadonlyArray<SessionEvent>, SightFailure>;
		// why: a tree is addressed by its root, because the root is the only part
		// of a Session anything outside it may resume or send to. Reading is
		// narrower than that: a node id addresses that node's own event feed, so
		// a reader can open the branch the words were actually said in.
		readonly sessionTree: (
			rootSessionId: string,
		) => Effect.Effect<SessionTree, SightFailure>;
		readonly sessionTreeFeed: (
			rootSessionId: string,
		) => Stream.Stream<SessionTree, SightFailure>;
		readonly spawn: (
			request: SpawnRequest,
		) => Effect.Effect<SpawnReceipt, SightFailure>;
	}
>()("@antumbra/contract/SightSource") {}
