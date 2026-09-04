import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import type { DatabaseFilePath } from "#data-dir.ts";
import fixtureContract from "#test/fixtures/contract.json" with { type: "json" };
import stepOneContract from "#test/fixtures/migrations/app/20260812T0956_init/end-contract.json" with { type: "json" };
import { freshMigrationDatabase, withSqlite } from "#test/migration-harness.ts";

const migrationsDirectory = fileURLToPath(new URL("./fixtures/migrations", import.meta.url));

const migrate = (database: DatabaseFilePath, contract: unknown) => applyMigrations({ contract, database, migrationsDirectory });

const backupsDirectory = (database: DatabaseFilePath) => join(dirname(database), "backups");

const backupsOf = (database: DatabaseFilePath) => {
	const directory = backupsDirectory(database);
	return existsSync(directory) ? readdirSync(directory).sort() : [];
};

const setClock = TestClock.setTime(Date.UTC(2026, 8, 4, 10, 15, 30));

const markerHash = (path: string) =>
	withSqlite(path, (connection) => connection.prepare(`SELECT "core_hash" FROM "_prisma_marker" WHERE "space" = 'app'`).get()?.core_hash);

it.effect("backs up a database seeded at an older contract before migrating it", () =>
	Effect.gen(function* () {
		const database = freshMigrationDatabase();
		yield* setClock;
		yield* migrate(database, stepOneContract);
		yield* migrate(database, fixtureContract);

		expect(backupsOf(database)).toEqual(["antumbra-20260904T101530Z-0770f0a0.db"]);
		expect(markerHash(join(backupsDirectory(database), "antumbra-20260904T101530Z-0770f0a0.db"))).toBe(stepOneContract.storage.storageHash);
		expect(markerHash(database)).toBe(fixtureContract.storage.storageHash);
	}),
);

it.effect("takes no backup for a fresh or already current database", () =>
	Effect.gen(function* () {
		const database = freshMigrationDatabase();
		yield* migrate(database, fixtureContract);
		yield* migrate(database, fixtureContract);
		expect(backupsOf(database)).toEqual([]);
	}),
);

it.effect("keeps only the five newest backups", () =>
	Effect.gen(function* () {
		const database = freshMigrationDatabase();
		const directory = backupsDirectory(database);
		mkdirSync(directory);
		const older = [1, 2, 3, 4, 5].map((day) => `antumbra-2026010${day}T000000Z-00000000.db`);
		for (const name of older) {
			writeFileSync(join(directory, name), "");
		}
		yield* setClock;
		yield* migrate(database, stepOneContract);
		yield* migrate(database, fixtureContract);

		expect(backupsOf(database)).toEqual([...older.slice(1), "antumbra-20260904T101530Z-0770f0a0.db"]);
	}),
);
