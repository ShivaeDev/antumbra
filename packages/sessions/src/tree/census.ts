import type { StoredAgentSession } from "@antumbra/persistence";
import type { CensusedNode } from "@antumbra/plugin-api";
import { Effect } from "effect";

export type Censused = (nodeSessionId: string, working: boolean) => Effect.Effect<void>;

const sessionIds = (rows: ReadonlyArray<StoredAgentSession>): ReadonlyMap<string, string> =>
	new Map(rows.flatMap((row) => (row.nativeRef === null ? [] : [[row.nativeRef, row.id] as const])));

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
