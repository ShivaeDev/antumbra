import type { StoredAgentSession } from "@antumbra/persistence";
import type { CensusedNode } from "@antumbra/plugin-api";
import { Effect } from "effect";

// why: what a census concluded about one child, told to whoever holds the
// registry the rest predicate reads. Working is the whole of the question: a
// provider that never says how a child ended can still say whether anything is
// running in it, and that is the fact rest turns on.
export type Censused = (nodeSessionId: string, working: boolean) => Effect.Effect<void>;

// why: a census speaks in the provider's references and a delegation is held by
// Session id, so the node rows are the translation between them.
const sessionIds = (rows: ReadonlyArray<StoredAgentSession>): ReadonlyMap<string, string> =>
	new Map(rows.flatMap((row) => (row.nativeRef === null ? [] : [[row.nativeRef, row.id] as const])));

// why: a reference no row carries is passed over rather than guessed at. The
// census admits such a child through the event path, and the next reading finds
// the row that admission left behind — nothing has to be invented here to keep
// the two accounts agreeing.
export const settleCensusedWork = (
	rows: ReadonlyArray<StoredAgentSession>,
	found: ReadonlyArray<CensusedNode>,
	censused: Censused,
): Effect.Effect<void> => {
	const ids = sessionIds(rows);
	return Effect.forEach(
		found,
		(node) => {
			const sessionId = ids.get(node.nodeRef);
			return sessionId === undefined ? Effect.void : censused(sessionId, node.working);
		},
		{ concurrency: 1, discard: true },
	);
};
