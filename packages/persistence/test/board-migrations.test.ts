import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterAll, expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import committedContract from "#contract.json" with { type: "json" };
import { brandDatabaseFilePath } from "#data-dir.ts";
import { packagedMigrationsDirectory, type TemporaryPersistence } from "#testing.ts";

const directories: string[] = [];
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const boardOwnerMigration = join(packageRoot, "migrations", "app", "20260816T1150_board_owner");
const boardOwnerContract: unknown = JSON.parse(readFileSync(join(boardOwnerMigration, "end-contract.json"), "utf8"));
const boardOwnerStart: unknown = JSON.parse(readFileSync(join(boardOwnerMigration, "start-contract.json"), "utf8"));

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const freshDatabase = (): TemporaryPersistence["database"] => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-board-migration-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

const withSqlite = <A>(path: string, act: (database: DatabaseSync) => A): A => {
	const database = new DatabaseSync(path);
	const result = act(database);
	database.close();
	return result;
};

const migrateToBoardStart = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: boardOwnerStart,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const seedBoard = (database: DatabaseSync, boardId: string) => {
	database.prepare('INSERT INTO "board" ("id") VALUES (?)').run(boardId);
};

it.effect("rejects one Board linked to owners of two different kinds", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToBoardStart(database);
		withSqlite(database, (sqlite) => {
			seedBoard(sqlite, "board-1");
			sqlite
				.prepare('INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)')
				.run("agent-1", "hand", "sound the shallows", "alive");
			sqlite
				.prepare('INSERT INTO "voyage" ("id", "name", "northStar", "context", "backend") VALUES (?, ?, ?, ?, ?)')
				.run("voyage-1", "Reef", "Chart it", "Open water", "codex");
			sqlite.prepare('INSERT INTO "agentBoard" ("agentId", "boardId") VALUES (?, ?)').run("agent-1", "board-1");
			sqlite.prepare('INSERT INTO "voyageBoard" ("voyageId", "boardId") VALUES (?, ?)').run("voyage-1", "board-1");
		});

		const failure = yield* Effect.flip(
			applyMigrations({
				contract: boardOwnerContract,
				database,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(failure.detail).toContain("UNIQUE constraint failed");
		expect(withSqlite(database, (sqlite) => sqlite.prepare('SELECT COUNT(*) AS "count" FROM "agentBoard"').get())).toMatchObject({ count: 1 });
		expect(
			withSqlite(database, (sqlite) =>
				sqlite.prepare('SELECT COUNT(*) AS "count" FROM "sqlite_master" WHERE "type" = ? AND "name" = ?').get("table", "boardOwner"),
			),
		).toMatchObject({ count: 0 });
	}),
);

it.effect("rejects a Board link whose typed owner is gone", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToBoardStart(database);
		withSqlite(database, (sqlite) => {
			seedBoard(sqlite, "board-1");
			sqlite.prepare('INSERT INTO "agentBoard" ("agentId", "boardId") VALUES (?, ?)').run("missing-agent", "board-1");
		});

		const failure = yield* Effect.flip(
			applyMigrations({
				contract: boardOwnerContract,
				database,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(failure.detail).toContain("UNIQUE constraint failed");
		expect(withSqlite(database, (sqlite) => sqlite.prepare('SELECT COUNT(*) AS "count" FROM "agentBoard"').get())).toMatchObject({ count: 1 });
		expect(
			withSqlite(database, (sqlite) =>
				sqlite.prepare('SELECT COUNT(*) AS "count" FROM "sqlite_master" WHERE "type" = ? AND "name" = ?').get("table", "boardOwner"),
			),
		).toMatchObject({ count: 0 });
	}),
);

it.effect("transfers typed owners and gives existing entries a stable order", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToBoardStart(database);
		withSqlite(database, (sqlite) => {
			seedBoard(sqlite, "board-1");
			sqlite
				.prepare('INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)')
				.run("agent-1", "hand", "sound the shallows", "alive");
			sqlite.prepare('INSERT INTO "agentBoard" ("agentId", "boardId") VALUES (?, ?)').run("agent-1", "board-1");
			const insert = sqlite.prepare(
				'INSERT INTO "boardEntry" ("id", "boardId", "register", "authorAgentId", "body", "createdAt") VALUES (?, ?, ?, ?, ?, ?)',
			);
			insert.run("entry-b", "board-1", "smooth", null, "second", "2026-08-16 00:00:00");
			insert.run("entry-c", "board-1", "smooth", null, "third", "2026-08-16 00:01:00");
			insert.run("entry-a", "board-1", "smooth", null, "first", "2026-08-16 00:00:00");
		});

		yield* applyMigrations({
			contract: committedContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		const migrated = withSqlite(database, (sqlite) => ({
			entries: sqlite.prepare('SELECT "id", "kind", "precedence", "seq", "sourceRef" FROM "boardEntry" ORDER BY "seq"').all(),
			owners: sqlite.prepare('SELECT * FROM "boardOwner"').all(),
			receipts: sqlite.prepare('SELECT COUNT(*) AS "count" FROM "boardEntryReceipt"').get(),
		}));
		expect(migrated.owners).toMatchObject([{ boardId: "board-1", ownerId: "agent-1", ownerKind: "agent" }]);
		expect(migrated.entries).toMatchObject([
			{
				id: "entry-a",
				kind: "note",
				precedence: "routine",
				seq: 1,
				sourceRef: null,
			},
			{
				id: "entry-b",
				kind: "note",
				precedence: "routine",
				seq: 2,
				sourceRef: null,
			},
			{
				id: "entry-c",
				kind: "note",
				precedence: "routine",
				seq: 3,
				sourceRef: null,
			},
		]);
		expect(migrated.receipts).toMatchObject({ count: 0 });
	}),
);
