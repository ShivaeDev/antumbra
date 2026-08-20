import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { afterAll, expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import committedContract from "#contract.json" with { type: "json" };
import { brandDatabaseFilePath } from "#data-dir.ts";
import {
	packagedMigrationsDirectory,
	type TemporaryPersistence,
} from "#testing.ts";

const directories: string[] = [];
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migration = join(
	packageRoot,
	"migrations",
	"app",
	"20260820T1601_session_tree",
);
const startContract: unknown = JSON.parse(
	readFileSync(join(migration, "start-contract.json"), "utf8"),
);

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const freshDatabase = (): TemporaryPersistence["database"] => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-session-tree-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

const withSqlite = <A>(path: string, act: (database: DatabaseSync) => A): A => {
	const database = new DatabaseSync(path);
	const result = act(database);
	database.close();
	return result;
};

const migrateToStart = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: startContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const migrateToEnd = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: committedContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const seedAgent = (database: DatabaseSync, id: string) =>
	database
		.prepare(
			'INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)',
		)
		.run(id, "hand", `charter ${id}`, "alive");

const seedSession = (
	database: DatabaseSync,
	agentId: string,
	id: string,
	status: "closed" | "open",
) => {
	database
		.prepare(
			'INSERT INTO "agentSession" ("id", "agentId", "backend", "cwd", "status", "executionStatus") VALUES (?, ?, ?, ?, ?, ?)',
		)
		.run(id, agentId, "scripted", `/tmp/${agentId}`, status, "idle");
	database
		.prepare(
			'INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)',
		)
		.run(id, 0, "raw", `event-${id}`);
};

const SESSION_INSERT =
	'INSERT INTO "agentSession" ("id", "agentId", "backend", "cwd", "status", "executionStatus", "completeness", "rootSessionId", "parentSessionId") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

const openNode = (
	sqlite: DatabaseSync,
	node: {
		readonly id: string;
		readonly parentSessionId: string | null;
		readonly rootSessionId: string;
	},
) =>
	sqlite
		.prepare(SESSION_INSERT)
		.run(
			node.id,
			"agent-one",
			"scripted",
			"/tmp/agent-one",
			"open",
			"active",
			"recording",
			node.rootSessionId,
			node.parentSessionId,
		);

const refused = (
	database: TemporaryPersistence["database"],
	act: (sqlite: DatabaseSync) => void,
) =>
	Exit.isFailure(
		Effect.runSyncExit(
			Effect.try({
				catch: (cause) => new Error(String(cause)),
				try: () => withSqlite(database, act),
			}),
		),
	);

const seedFleet = (database: DatabaseSync) => {
	seedAgent(database, "agent-one");
	seedAgent(database, "agent-two");
	seedSession(database, "agent-one", "session-open", "open");
	seedSession(database, "agent-one", "session-closed", "closed");
	seedSession(database, "agent-two", "session-other", "open");
};

it.effect(
	"roots every surviving Session at itself without losing history",
	() =>
		Effect.gen(function* () {
			const database = freshDatabase();
			yield* migrateToStart(database);
			withSqlite(database, seedFleet);

			yield* migrateToEnd(database);
			const migrated = withSqlite(database, (sqlite) => ({
				events: sqlite
					.prepare('SELECT COUNT(*) AS "count" FROM "sessionEvent"')
					.get(),
				sessions: sqlite
					.prepare(
						'SELECT "id", "completeness", "parentSessionId", "rootSessionId" FROM "agentSession" ORDER BY "id"',
					)
					.all(),
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

it.effect("refuses a Session event whose Session is gone", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedFleet(sqlite);
			sqlite
				.prepare(
					'INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)',
				)
				.run("session-vanished", 0, "raw", "orphan");
		});

		expect(Exit.isFailure(yield* Effect.exit(migrateToEnd(database)))).toBe(
			true,
		);
	}),
);

it.effect("refuses an Agent already holding two open root Sessions", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedFleet(sqlite);
			seedSession(sqlite, "agent-one", "session-second-open", "open");
		});

		expect(Exit.isFailure(yield* Effect.exit(migrateToEnd(database)))).toBe(
			true,
		);
	}),
);

it.effect("refuses a Session status outside the durable vocabulary", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedFleet(sqlite);
			sqlite
				.prepare('UPDATE "agentSession" SET "status" = ? WHERE "id" = ?')
				.run("future-session", "session-closed");
		});

		expect(Exit.isFailure(yield* Effect.exit(migrateToEnd(database)))).toBe(
			true,
		);
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
					.prepare(
						'INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)',
					)
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
		expect(
			refused(database, (sqlite) =>
				sqlite
					.prepare('DELETE FROM "agentSession" WHERE "id" = ?')
					.run("session-open"),
			),
		).toBe(true);
	}),
);

it.effect("admits one open root per Agent while welcoming subsessions", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, seedFleet);
		yield* migrateToEnd(database);

		const openSession = (
			id: string,
			parentSessionId: string | null,
			rootSessionId: string,
		) =>
			refused(database, (sqlite) =>
				openNode(sqlite, { id, parentSessionId, rootSessionId }),
			)
				? ("refused" as const)
				: ("admitted" as const);
		expect(openSession("session-rival-root", null, "session-rival-root")).toBe(
			"refused",
		);
		expect(openSession("session-child", "session-open", "session-open")).toBe(
			"admitted",
		);
		expect(
			openSession("session-grandchild", "session-child", "session-open"),
		).toBe("admitted");
	}),
);
