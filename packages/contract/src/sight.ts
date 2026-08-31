import { HistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Data, type Effect, Schema, type Stream } from "effect";
import type { Fleet, RepoSummary } from "#fleet.ts";
import type { SessionImage, SessionImageRequest, SessionInputReceipt, SessionInputRequest } from "#session-inputs.ts";
import { ChangeSituation } from "#session-situations.ts";
import type { SessionTree } from "#session-tree.ts";

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

export const SituationDraft = Schema.Struct({
	changeId: Schema.String,
	situation: ChangeSituation,
});
export type SituationDraft = typeof SituationDraft.Type;

export class SightFailure extends Data.TaggedError("SightFailure")<{
	readonly message: string;
}> {}

export class SightSource extends Context.Service<
	SightSource,
	{
		readonly fleet: Effect.Effect<Fleet, SightFailure>;
		readonly fleetFeed: Stream.Stream<Fleet, SightFailure>;
		readonly forgetRepo: (repoId: string) => Effect.Effect<void, SightFailure>;
		readonly interrupt: (sessionId: string) => Effect.Effect<void, SightFailure>;
		readonly registerRepo: (registration: RepoRegistration) => Effect.Effect<RepoSummary, SightFailure>;
		readonly retryBackend: (backend: string) => Effect.Effect<void, SightFailure>;
		readonly retire: (agentId: string) => Effect.Effect<void, SightFailure>;
		readonly retireCrew: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly send: (sessionId: string, text: string) => Effect.Effect<void, SightFailure>;
		readonly sendInput: (request: SessionInputRequest) => Effect.Effect<SessionInputReceipt, SightFailure>;
		readonly sessionImage: (request: SessionImageRequest) => Effect.Effect<SessionImage, SightFailure>;
		readonly sessionEventFeed: (query: EventQuery) => Stream.Stream<SessionEvent, SightFailure>;
		readonly sessionEvents: (query: EventQuery) => Effect.Effect<ReadonlyArray<SessionEvent>, SightFailure>;
		readonly sessionTree: (rootSessionId: string) => Effect.Effect<SessionTree, SightFailure>;
		readonly sessionTreeFeed: (rootSessionId: string) => Stream.Stream<SessionTree, SightFailure>;
		readonly situationDraft: (draft: SituationDraft) => Effect.Effect<string, SightFailure>;
		readonly sleep: (sessionId: string) => Effect.Effect<void, SightFailure>;
		readonly spawn: (request: SpawnRequest) => Effect.Effect<SpawnReceipt, SightFailure>;
	}
>()("@antumbra/contract/SightSource") {}
