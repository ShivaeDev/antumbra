import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import committedContract from "#contract.json" with { type: "json" };
import { freshMigrationDatabase as freshDatabase, withSqlite } from "#test/migration-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const startContract: unknown = JSON.parse(
	readFileSync(join(packageRoot, "migrations", "app", "20260830T2152_voyage_captain_crew_backends", "start-contract.json"), "utf8"),
);

it.effect("copies the existing voyage backend to captain and crew", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* applyMigrations({
			contract: startContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		withSqlite(database, (sqlite) => {
			const insert = sqlite.prepare('INSERT INTO "voyage" ("id", "kind", "name", "northStar", "context", "backend") VALUES (?, ?, ?, ?, ?, ?)');
			insert.run("voyage-reef", "voyage", "Chart the reef", "every shoal is known", "the reef is uncharted", "codex");
		});

		yield* applyMigrations({
			contract: committedContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});

		expect(
			withSqlite(database, (sqlite) => sqlite.prepare('SELECT "id", "kind", "captainBackend", "crewBackend" FROM "voyage" ORDER BY "id"').all()),
		).toEqual([
			{
				captainBackend: "codex",
				crewBackend: "codex",
				id: "voyage-reef",
				kind: "voyage",
			},
		]);
	}),
);
