import type { SessionTree, SightFailure } from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { assembleSessionTree, type SessionTreeRow } from "@antumbra/sessions";
import { decodeStoredAgentSessionCompleteness, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { decodeStoredSubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { Effect, Stream } from "effect";
import { toFailure } from "#sight-failure.ts";

interface SightSessionTree {
	readonly sessionTree: (rootSessionId: string) => Effect.Effect<SessionTree, SightFailure>;
	readonly sessionTreeFeed: (rootSessionId: string) => Stream.Stream<SessionTree, SightFailure>;
}

const SHAPING: ReadonlySet<string> = new Set(["session.opened", "subsession.ended", "subsession.gap", "subsession.opened"]);

const shapesATree = (row: StoredEvent): boolean => SHAPING.has(row.kind);

const readRow = (row: StoredAgentSession) =>
	Effect.all({
		completeness: Effect.fromResult(decodeStoredAgentSessionCompleteness(row.id, row.completeness)),
		outcome: Effect.fromResult(decodeStoredSubsessionOutcome(row.id, row.outcome)),
		status: Effect.fromResult(decodeStoredAgentSessionStatus(row.id, row.status)),
	}).pipe(
		Effect.map(
			({ completeness, outcome, status }) =>
				({
					completeness,
					id: row.id,
					kind: row.kind,
					label: row.label,
					nativeRef: row.nativeRef,
					outcome,
					parentSessionId: row.parentSessionId,
					status,
				}) satisfies SessionTreeRow,
		),
	);

export const makeSightSessionTree = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const db = yield* Database;

	const sessionTree = (rootSessionId: string) =>
		db.AgentSession.where({ rootSessionId })
			.orderBy((session) => session.createdAt.asc())
			.all()
			.pipe(
				Effect.flatMap((rows) => Effect.forEach(rows, readRow)),
				Effect.map((rows) => assembleSessionTree(rootSessionId, rows)),
				Effect.mapError(toFailure),
			);

	return {
		sessionTree,
		// Subscribe before the first snapshot so a concurrent shaping event cannot be missed.
		sessionTreeFeed: (rootSessionId) =>
			Stream.unwrap(
				Effect.gen(function* () {
					const subscription = yield* feeds.subscribeSessionEvents();
					const current = yield* sessionTree(rootSessionId);
					const live = Stream.fromSubscription(subscription).pipe(
						Stream.filter(shapesATree),
						Stream.mapEffect(() => sessionTree(rootSessionId)),
					);
					return Stream.make(current).pipe(Stream.concat(live));
				}),
			),
	} satisfies SightSessionTree;
});
