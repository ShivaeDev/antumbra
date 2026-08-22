import { HistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Data, type Effect, Schema, type Stream } from "effect";
import type { Fleet, RepoSummary } from "#fleet.ts";
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
		// why: the words the situation would put in front of the admiral, read on
		// demand rather than carried on every fleet snapshot — prose belongs to
		// the one control that is about to show it, not to every row that has a
		// Change. Drafting says nothing to anybody: the send is a separate act,
		// and what it carries is whatever the admiral left in the box.
		readonly situationDraft: (
			draft: SituationDraft,
		) => Effect.Effect<string, SightFailure>;
		// why: the admiral asking for the same rest the clock would have given an
		// hour later. It goes through the one act that already knows how to give
		// it, so there is one way a Session is put to rest and one way it wakes.
		readonly sleep: (sessionId: string) => Effect.Effect<void, SightFailure>;
		readonly spawn: (
			request: SpawnRequest,
		) => Effect.Effect<SpawnReceipt, SightFailure>;
	}
>()("@antumbra/contract/SightSource") {}
