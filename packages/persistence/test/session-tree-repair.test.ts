import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import {
	freshDatabase,
	migrateToEnd,
	migrateToStart,
	oneOpenRootIndexExists,
	pointAgentAt,
	refused,
	seedAgent,
	seedDatedOpenSession,
	sessionsOf,
	withSqlite,
} from "#test/session-tree-harness.ts";

// Legacy databases may predate the one-open-root index.
it.effect("closes every open root but the newest when an Agent points nowhere", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedAgent(sqlite, "agent-legacy");
			seedDatedOpenSession(sqlite, "agent-legacy", "session-old", "2026-08-18 08:00:00");
			seedDatedOpenSession(sqlite, "agent-legacy", "session-tie-a", "2026-08-19 09:00:00");
			seedDatedOpenSession(sqlite, "agent-legacy", "session-tie-b", "2026-08-19 09:00:00");
		});

		yield* migrateToEnd(database);

		expect(sessionsOf(database, "agent-legacy")).toEqual([
			{ completeness: "unaudited", id: "session-old", status: "closed" },
			{ completeness: "unaudited", id: "session-tie-a", status: "closed" },
			{ completeness: "recording", id: "session-tie-b", status: "open" },
		]);
		expect(oneOpenRootIndexExists(database)).toEqual({ count: 1 });
		expect(refused(database, (sqlite) => seedDatedOpenSession(sqlite, "agent-legacy", "session-rival", "2026-08-20 10:00:00"))).toBe(true);
	}),
);

it.effect("keeps the Session an Agent points at and closes newer history", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedAgent(sqlite, "agent-explicit");
			seedDatedOpenSession(sqlite, "agent-explicit", "session-held", "2026-08-18 08:00:00");
			seedDatedOpenSession(sqlite, "agent-explicit", "session-newer", "2026-08-19 09:00:00");
			pointAgentAt(sqlite, "agent-explicit", "session-held");
		});

		yield* migrateToEnd(database);

		expect(sessionsOf(database, "agent-explicit")).toEqual([
			{ completeness: "recording", id: "session-held", status: "open" },
			{ completeness: "unaudited", id: "session-newer", status: "closed" },
		]);
		expect(withSqlite(database, (sqlite) => sqlite.prepare('SELECT "currentSessionId" FROM "agent" WHERE "id" = ?').get("agent-explicit"))).toEqual({
			currentSessionId: "session-held",
		});
	}),
);
