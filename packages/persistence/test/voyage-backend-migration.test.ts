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
import {
	packagedMigrationsDirectory,
	type TemporaryPersistence,
} from "#testing.ts";

const directories: string[] = [];
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const startContract: unknown = JSON.parse(
	readFileSync(
		join(
			packageRoot,
			"migrations",
			"app",
			"20260830T1235_voyage_captain_crew_backends",
			"start-contract.json",
		),
		"utf8",
	),
);

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const freshDatabase = (): TemporaryPersistence["database"] => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-voyage-backend-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

const withSqlite = <A>(path: string, act: (database: DatabaseSync) => A): A => {
	const database = new DatabaseSync(path);
	const result = act(database);
	database.close();
	return result;
};

// why: the upgrade may not change where a single voyage's next spawn goes, so
// the captain's seat and the crew's both start out holding the one backend the
// voyage already sailed on.
it.effect("seats both backends where one voyage backend stood", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* applyMigrations({
			contract: startContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		withSqlite(database, (sqlite) => {
			const insert = sqlite.prepare(
				'INSERT INTO "voyage" ("id", "kind", "name", "northStar", "context", "backend") VALUES (?, ?, ?, ?, ?, ?)',
			);
			insert.run(
				"voyage-reef",
				"voyage",
				"Chart the reef",
				"every shoal is known",
				"the reef is uncharted",
				"codex",
			);
			insert.run(
				"voyage-fleet",
				"flagship",
				"Flagship",
				"The fleet sails well.",
				"",
				"claude",
			);
		});

		yield* applyMigrations({
			contract: committedContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});

		expect(
			withSqlite(database, (sqlite) =>
				sqlite
					.prepare(
						'SELECT "id", "kind", "captainBackend", "crewBackend" FROM "voyage" ORDER BY "id"',
					)
					.all(),
			),
		).toEqual([
			{
				captainBackend: "claude",
				crewBackend: "claude",
				id: "voyage-fleet",
				kind: "flagship",
			},
			{
				captainBackend: "codex",
				crewBackend: "codex",
				id: "voyage-reef",
				kind: "voyage",
			},
		]);
	}),
);
