import {
	Database,
	type StoredAgentSession,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { AgentSessionCompleteness } from "@antumbra/vocabulary/agent-runtime";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";
import {
	isRootSession,
	nodeSessionsOnly,
	openSessions,
} from "#session-roots.ts";

const GAP = "subsession.gap";

const gapKindOf = (row: {
	readonly kind: string;
	readonly payload: string;
}): ReadonlyArray<string> => {
	const projected = projectHistoricalAgentEvent(row.kind, row.payload);
	return projected._tag === "Known" && projected.event.type === GAP
		? [projected.event.gapKind]
		: [];
};

const rawOf = (row: {
	readonly kind: string;
	readonly payload: string;
}): ReadonlyArray<string> => {
	const projected = projectHistoricalAgentEvent(row.kind, row.payload);
	return projected._tag === "Known" ? [projected.event.raw.payload] : [];
};

// why: what the durable record already says about a node — the gaps journaled
// against it, the provider bytes written under it, and the rows themselves. An
// audit answers from these rather than from a tree held in memory, because the
// nodes it has most to say about are the ones that closed while nothing was
// listening.
export const makeSessionTreeLedger = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	// why: a read that could not answer is refusal, never emptiness. An audit
	// handed an empty gap set for a ledger it failed to read would call the node
	// complete on the strength of a failed query.
	const refusable = <A>(read: Effect.Effect<A, unknown, WriteExecutors>) =>
		provide(read).pipe(
			Effect.map(Option.some),
			Effect.catchCause((cause) =>
				Effect.logError(
					"the record of a subsession could not be read",
					cause,
				).pipe(Effect.as(Option.none<A>())),
			),
		);
	const gapKinds = (sessionId: string) =>
		refusable(db.SessionEvent.where({ kind: GAP, sessionId }).all()).pipe(
			Effect.map(Option.map((rows) => rows.flatMap(gapKindOf))),
		);
	const recorded = (sessionId: string) =>
		provide(db.SessionEvent.where({ sessionId }).all()).pipe(
			Effect.map((rows) => rows.flatMap(rawOf)),
			Effect.catchCause((cause) =>
				Effect.logError(
					"a subsession's own provider bytes could not be read back",
					{ sessionId },
					cause,
				).pipe(Effect.as<ReadonlyArray<string>>([])),
			),
		);
	const nodeRows = (rootSessionId: string) =>
		provide(db.AgentSession.where({ rootSessionId }).all()).pipe(
			Effect.map((rows) => rows.filter((row) => !isRootSession(row))),
			Effect.catchCause((cause) =>
				Effect.logError(
					"the nodes of a Session tree could not be read",
					{ rootSessionId },
					cause,
				).pipe(Effect.as<ReadonlyArray<StoredAgentSession>>([])),
			),
		);
	// why: the durable answer to "does this tree already hold that reference" —
	// the question a re-driven child has to be asked before a second row for it
	// is minted.
	const nodeRow = (rootSessionId: string, nativeRef: string) =>
		provide(db.AgentSession.where({ nativeRef, rootSessionId }).first()).pipe(
			Effect.map(
				Option.flatMap((row) =>
					isRootSession(row) ? Option.none() : Option.some(row),
				),
			),
			Effect.catchCause((cause) =>
				Effect.logError(
					"a subsession row could not be read by its provider reference",
					{ nativeRef, rootSessionId },
					cause,
				).pipe(Effect.as(Option.none<StoredAgentSession>())),
			),
		);
	const openNodes = provide(
		db.AgentSession.where(openSessions).where(nodeSessionsOnly).all(),
	).pipe(
		Effect.catchCause((cause) =>
			Effect.logError(
				"open subsessions could not be read at startup",
				cause,
			).pipe(Effect.as<ReadonlyArray<StoredAgentSession>>([])),
		),
	);
	const settle = (sessionId: string, completeness: AgentSessionCompleteness) =>
		provide(
			writer.write(
				db.AgentSession.where({ id: sessionId }).update({ completeness }),
			),
		).pipe(
			Effect.asVoid,
			Effect.catchCause((cause) =>
				Effect.logError(
					"a subsession's completeness could not be settled",
					{ completeness, sessionId },
					cause,
				),
			),
		);
	return { gapKinds, nodeRow, nodeRows, openNodes, recorded, settle };
});
