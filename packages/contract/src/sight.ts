import { Context, Data, type Effect, Schema, type Stream } from "effect";

export const SessionSummary = Schema.Struct({
	backend: Schema.String,
	cwd: Schema.String,
	id: Schema.String,
	status: Schema.String,
});
export type SessionSummary = typeof SessionSummary.Type;

export const BerthSummary = Schema.Struct({
	branch: Schema.String,
	slug: Schema.String,
	status: Schema.String,
});
export type BerthSummary = typeof BerthSummary.Type;

export const AgentSummary = Schema.Struct({
	berths: Schema.Array(BerthSummary),
	charter: Schema.String,
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
	repos: Schema.Array(RepoSummary),
});
export type Fleet = typeof Fleet.Type;

export const SessionEvent = Schema.Struct({
	kind: Schema.String,
	payload: Schema.String,
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
		readonly sessionEventFeed: (
			query: EventQuery,
		) => Stream.Stream<SessionEvent, SightFailure>;
		readonly sessionEvents: (
			query: EventQuery,
		) => Effect.Effect<ReadonlyArray<SessionEvent>, SightFailure>;
		readonly spawn: (
			request: SpawnRequest,
		) => Effect.Effect<SpawnReceipt, SightFailure>;
	}
>()("@antumbra/contract/SightSource") {}
