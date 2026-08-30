import type { SessionTree, SightFailure } from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { assembleSessionTree, type SessionTreeRow } from "@antumbra/sessions";
import { decodeStoredAgentSessionCompleteness, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { decodeStoredSubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { Effect, Stream } from "effect";
import { toFailure } from "#sight-failure.ts";

export interface SightSessionTree {
	readonly sessionTree: (rootSessionId: string) => Effect.Effect<SessionTree, SightFailure>;
	readonly sessionTreeFeed: (rootSessionId: string) => Stream.Stream<SessionTree, SightFailure>;
}

// why: these are the only frames that move a row of a tree, and each is
// written in the same transaction as the row it is about — so a re-read
// prompted by one of them already sees what it announced. Everything else a
// Session says leaves the shape of the tree exactly as it was.
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

	// why: one scan answers the whole tree — its shape and both its counts —
	// rather than a query per node or a query per status.
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
		// why: subscribe before the first read, so a node that opens while the
		// snapshot is being taken still prompts the re-read that shows it. The
		// picture is whole every time, so a redundant ring costs nothing and a
		// missed one is the only thing that could lie.
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
