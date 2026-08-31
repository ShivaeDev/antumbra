import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import committedContract from "#contract.json" with { type: "json" };
import { freshMigrationDatabase as freshDatabase, withSqlite } from "#test/migration-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migration = join(packageRoot, "migrations", "app", "20260817T2058_current_session_ownership");
const startContract: unknown = JSON.parse(readFileSync(join(migration, "start-contract.json"), "utf8"));

const seedAgent = (database: DatabaseSync, id: string, status: "alive" | "dormant" | "retired") =>
	database.prepare('INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)').run(id, "hand", `charter ${id}`, status);

const seedSession = (database: DatabaseSync, agentId: string, id: string, status: "closed" | "open", createdAt: string) => {
	database
		.prepare(
			'INSERT INTO "agentSession" ("id", "agentId", "backend", "cwd", "nativeRef", "status", "executionStatus", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		)
		.run(id, agentId, "scripted", `/tmp/${agentId}`, `native-${id}`, status, "idle", createdAt);
	database.prepare('INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)').run(id, 0, "raw", `event-${id}`);
};

it.effect("repairs one current Session without deleting Session history", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* applyMigrations({
			contract: startContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		withSqlite(database, (sqlite) => {
			seedAgent(sqlite, "agent-alive", "alive");
			seedAgent(sqlite, "agent-empty", "alive");
			seedAgent(sqlite, "agent-dormant", "dormant");
			seedAgent(sqlite, "agent-retired", "retired");
			seedSession(sqlite, "agent-alive", "session-older", "open", "2026-08-17 09:00:00");
			seedSession(sqlite, "agent-alive", "session-a", "open", "2026-08-17 10:00:00");
			seedSession(sqlite, "agent-alive", "session-b", "open", "2026-08-17 10:00:00");
			seedSession(sqlite, "agent-alive", "session-closed", "closed", "2026-08-17 11:00:00");
			seedSession(sqlite, "agent-dormant", "session-dormant", "open", "2026-08-17 10:00:00");
			seedSession(sqlite, "agent-retired", "session-retired", "open", "2026-08-17 10:00:00");
		});

		yield* applyMigrations({
			contract: committedContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		const migrated = withSqlite(database, (sqlite) => ({
			agents: sqlite.prepare('SELECT "id", "currentSessionId" FROM "agent" ORDER BY "id"').all(),
			events: sqlite.prepare('SELECT "sessionId", "payload" FROM "sessionEvent" ORDER BY "sessionId"').all(),
			sessions: sqlite.prepare('SELECT "id", "nativeRef", "status" FROM "agentSession" ORDER BY "id"').all(),
		}));
		expect(migrated.agents).toEqual([
			{ currentSessionId: "session-b", id: "agent-alive" },
			{ currentSessionId: null, id: "agent-dormant" },
			{ currentSessionId: null, id: "agent-empty" },
			{ currentSessionId: null, id: "agent-retired" },
		]);
		expect(migrated.sessions).toEqual([
			{ id: "session-a", nativeRef: "native-session-a", status: "closed" },
			{ id: "session-b", nativeRef: "native-session-b", status: "open" },
			{
				id: "session-closed",
				nativeRef: "native-session-closed",
				status: "closed",
			},
			{
				id: "session-dormant",
				nativeRef: "native-session-dormant",
				status: "closed",
			},
			{
				id: "session-older",
				nativeRef: "native-session-older",
				status: "closed",
			},
			{
				id: "session-retired",
				nativeRef: "native-session-retired",
				status: "closed",
			},
		]);
		expect(migrated.events).toEqual([
			{ payload: "event-session-a", sessionId: "session-a" },
			{ payload: "event-session-b", sessionId: "session-b" },
			{ payload: "event-session-closed", sessionId: "session-closed" },
			{ payload: "event-session-dormant", sessionId: "session-dormant" },
			{ payload: "event-session-older", sessionId: "session-older" },
			{ payload: "event-session-retired", sessionId: "session-retired" },
		]);
	}),
);
