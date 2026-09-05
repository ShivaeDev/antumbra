import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import { freshMigrationDatabase, withSqlite } from "#test/migration-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const beforeRoles: unknown = JSON.parse(
	readFileSync(join(packagedMigrationsDirectory, "app", "20260905T2122_agent_role_settings", "start-contract.json"), "utf8"),
);

const settled = (sqlite: DatabaseSync) =>
	sqlite.prepare('SELECT "scope", "role", "backend", "model", "effort" FROM "agentRoleSettings" ORDER BY "scope", "role"').all();

it.effect("carries the settings each voyage already sailed on onto its role rows", () =>
	Effect.gen(function* () {
		const database = freshMigrationDatabase();
		yield* applyMigrations({ contract: beforeRoles, database, migrationsDirectory: packagedMigrationsDirectory });
		withSqlite(database, (sqlite) => {
			const insert = sqlite.prepare(
				`INSERT INTO "voyage" ("id", "kind", "name", "context", "northStar", "captainBackend", "captainModel", "captainEffort", "crewBackend", "crewModel", "crewEffort")
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			);
			insert.run("voyage-fleet", "flagship", "Flagship", "", "The fleet sails well.", "claude", "opus", "high", "claude", null, null);
			insert.run("voyage-reef", "voyage", "Chart the reef", "", "every shoal is known", "codex", "gpt-5", "medium", "opencode", "sonnet", "low");
		});

		yield* applyMigrations({ database, migrationsDirectory: packagedMigrationsDirectory });

		expect(withSqlite(database, settled)).toEqual([
			{ backend: "claude", effort: "high", model: "opus", role: "flagship", scope: "fleet" },
			{ backend: "claude", effort: null, model: null, role: "crew", scope: "voyage-fleet" },
			{ backend: "codex", effort: "medium", model: "gpt-5", role: "captain", scope: "voyage-reef" },
			{ backend: "opencode", effort: "low", model: "sonnet", role: "crew", scope: "voyage-reef" },
		]);
	}),
);
