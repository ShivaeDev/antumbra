import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { decodeStoredAgentSessionCompleteness, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime.ts";
import { decodeStoredSubsessionOutcome } from "@antumbra/vocabulary/session-events.ts";
import { Effect } from "effect";
import { assembleSessionTree } from "#tree/view.ts";

const readRow = Effect.fnUntraced(function* (row: StoredAgentSession) {
	const decoded = yield* Effect.all({
		completeness: Effect.fromResult(decodeStoredAgentSessionCompleteness(row.id, row.completeness)),
		outcome: Effect.fromResult(decodeStoredSubsessionOutcome(row.id, row.outcome)),
		status: Effect.fromResult(decodeStoredAgentSessionStatus(row.id, row.status)),
	});
	return { ...row, ...decoded };
});

export const read = Effect.fn("SessionTrees.read")(function* (rootSessionId: string) {
	const db = yield* Database;
	const rows = yield* db.AgentSession.where({ rootSessionId })
		.orderBy((session) => session.createdAt.asc())
		.all();
	return assembleSessionTree(rootSessionId, yield* Effect.forEach(rows, readRow));
});
