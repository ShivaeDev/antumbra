import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Effect, Exit } from "effect";
import { afterAll } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import committedContract from "#contract.json" with { type: "json" };
import { brandDatabaseFilePath } from "#data-dir.ts";
import { packagedMigrationsDirectory, type TemporaryPersistence } from "#testing.ts";

const directories: string[] = [];
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migration = join(packageRoot, "migrations", "app", "20260820T1601_session_tree");
const startContract: unknown = JSON.parse(readFileSync(join(migration, "start-contract.json"), "utf8"));

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

export const freshDatabase = (): TemporaryPersistence["database"] => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-session-tree-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

export const withSqlite = <A>(path: string, act: (database: DatabaseSync) => A): A => {
	const database = new DatabaseSync(path);
	const result = act(database);
	database.close();
	return result;
};

export const migrateToStart = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: startContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

export const migrateToEnd = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: committedContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

export const seedAgent = (database: DatabaseSync, id: string) =>
	database.prepare('INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)').run(id, "hand", `charter ${id}`, "alive");

export const seedSession = (database: DatabaseSync, agentId: string, id: string, status: "closed" | "open") => {
	database
		.prepare('INSERT INTO "agentSession" ("id", "agentId", "backend", "cwd", "status", "executionStatus") VALUES (?, ?, ?, ?, ?, ?)')
		.run(id, agentId, "scripted", `/tmp/${agentId}`, status, "idle");
	database.prepare('INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)').run(id, 0, "raw", `event-${id}`);
};

export const seedDatedOpenSession = (database: DatabaseSync, agentId: string, id: string, createdAt: string) =>
	database
		.prepare('INSERT INTO "agentSession" ("id", "agentId", "backend", "cwd", "status", "executionStatus", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
		.run(id, agentId, "scripted", `/tmp/${agentId}`, "open", "idle", createdAt);

export const pointAgentAt = (database: DatabaseSync, agentId: string, sessionId: string) =>
	database.prepare('UPDATE "agent" SET "currentSessionId" = ? WHERE "id" = ?').run(sessionId, agentId);

export const sessionsOf = (database: TemporaryPersistence["database"], agentId: string) =>
	withSqlite(database, (sqlite) =>
		sqlite.prepare('SELECT "id", "status", "completeness" FROM "agentSession" WHERE "agentId" = ? ORDER BY "id"').all(agentId),
	);

export const oneOpenRootIndexExists = (database: TemporaryPersistence["database"]) =>
	withSqlite(database, (sqlite) =>
		sqlite
			.prepare(`SELECT COUNT(*) AS "count" FROM "sqlite_master" WHERE "type" = 'index' AND "name" = 'agentSession_one_open_root_per_agent'`)
			.get(),
	);

const SESSION_INSERT =
	'INSERT INTO "agentSession" ("id", "agentId", "backend", "cwd", "status", "executionStatus", "completeness", "rootSessionId", "parentSessionId") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

export const openNode = (
	sqlite: DatabaseSync,
	node: {
		readonly id: string;
		readonly parentSessionId: string | null;
		readonly rootSessionId: string;
	},
) =>
	sqlite
		.prepare(SESSION_INSERT)
		.run(node.id, "agent-one", "scripted", "/tmp/agent-one", "open", "active", "recording", node.rootSessionId, node.parentSessionId);

export const refused = (database: TemporaryPersistence["database"], act: (sqlite: DatabaseSync) => void) =>
	Exit.isFailure(
		Effect.runSyncExit(
			Effect.try({
				catch: (cause) => new Error(String(cause)),
				try: () => withSqlite(database, act),
			}),
		),
	);

export const seedFleet = (database: DatabaseSync) => {
	seedAgent(database, "agent-one");
	seedAgent(database, "agent-two");
	seedSession(database, "agent-one", "session-open", "open");
	seedSession(database, "agent-one", "session-closed", "closed");
	seedSession(database, "agent-two", "session-other", "open");
};
