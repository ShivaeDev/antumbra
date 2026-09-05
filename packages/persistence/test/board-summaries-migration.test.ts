import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import { freshMigrationDatabase, withSqlite } from "#test/migration-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const beforeSummaries: unknown = JSON.parse(
	readFileSync(join(packagedMigrationsDirectory, "app", "20260905T2256_board_summaries", "start-contract.json"), "utf8"),
);

const registers = (sqlite: DatabaseSync) => sqlite.prepare('SELECT "id", "register" FROM "boardEntry" ORDER BY "seq"').all();

it.effect("folds the notes an agent wrote into the rough register and leaves the admiral's own alone", () =>
	Effect.gen(function* () {
		const database = freshMigrationDatabase();
		yield* applyMigrations({ contract: beforeSummaries, database, migrationsDirectory: packagedMigrationsDirectory });
		withSqlite(database, (sqlite) => {
			sqlite.prepare('INSERT INTO "board" ("id") VALUES (?)').run("board-1");
			const insert = sqlite.prepare(
				`INSERT INTO "boardEntry" ("id", "boardId", "seq", "kind", "precedence", "sourceRef", "register", "authorAgentId", "body")
				 VALUES (?, 'board-1', ?, ?, 'routine', NULL, ?, ?, 'an entry')`,
			);
			insert.run("agent-note", 1, "note", "smooth", "agent-1");
			insert.run("admiral-note", 2, "note", "smooth", null);
			insert.run("agent-rough", 3, "note", "rough", "agent-1");
			insert.run("agent-mail", 4, "mail", "smooth", "agent-1");
		});

		yield* applyMigrations({ database, migrationsDirectory: packagedMigrationsDirectory });

		expect(withSqlite(database, registers)).toEqual([
			{ id: "agent-note", register: "rough" },
			{ id: "admiral-note", register: "smooth" },
			{ id: "agent-rough", register: "rough" },
			{ id: "agent-mail", register: "smooth" },
		]);
	}),
);
