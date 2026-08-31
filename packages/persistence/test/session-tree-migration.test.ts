import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { freshDatabase, migrateToEnd, migrateToStart, openNode, refused, seedFleet, withSqlite } from "#test/session-tree-harness.ts";

it.effect("roots every surviving Session at itself without losing history", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, seedFleet);

		yield* migrateToEnd(database);
		const migrated = withSqlite(database, (sqlite) => ({
			events: sqlite.prepare('SELECT COUNT(*) AS "count" FROM "sessionEvent"').get(),
			sessions: sqlite.prepare('SELECT "id", "completeness", "parentSessionId", "rootSessionId" FROM "agentSession" ORDER BY "id"').all(),
		}));
		expect(migrated.sessions).toEqual([
			{
				completeness: "unaudited",
				id: "session-closed",
				parentSessionId: null,
				rootSessionId: "session-closed",
			},
			{
				completeness: "recording",
				id: "session-open",
				parentSessionId: null,
				rootSessionId: "session-open",
			},
			{
				completeness: "recording",
				id: "session-other",
				parentSessionId: null,
				rootSessionId: "session-other",
			},
		]);
		expect(migrated.events).toEqual({ count: 3 });
	}),
);

it.effect("holds the Session tree and its events to referential truth", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, seedFleet);
		yield* migrateToEnd(database);

		expect(
			refused(database, (sqlite) =>
				sqlite
					.prepare('INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)')
					.run("session-missing", 0, "raw", "orphan"),
			),
		).toBe(true);
		expect(
			refused(database, (sqlite) =>
				openNode(sqlite, {
					id: "session-orphan-child",
					parentSessionId: "session-missing",
					rootSessionId: "session-open",
				}),
			),
		).toBe(true);
		expect(refused(database, (sqlite) => sqlite.prepare('DELETE FROM "agentSession" WHERE "id" = ?').run("session-open"))).toBe(true);
	}),
);

it.effect("admits one open root per Agent while welcoming subsessions", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, seedFleet);
		yield* migrateToEnd(database);

		const openSession = (id: string, parentSessionId: string | null, rootSessionId: string) =>
			refused(database, (sqlite) => openNode(sqlite, { id, parentSessionId, rootSessionId })) ? ("refused" as const) : ("admitted" as const);
		expect(openSession("session-rival-root", null, "session-rival-root")).toBe("refused");
		expect(openSession("session-child", "session-open", "session-open")).toBe("admitted");
		expect(openSession("session-grandchild", "session-child", "session-open")).toBe("admitted");
	}),
);
