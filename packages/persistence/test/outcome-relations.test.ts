import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { applyMigrations } from "@antumbra/persistence";
import { packagedMigrationsDirectory, persistenceIt, type TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { freshMigrationDatabase as freshDatabase, withSqlite } from "#test/migration-harness.ts";

const it = persistenceIt();
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationDirectory = join(packageRoot, "migrations", "app", "20260817T0543_outcome_relational_integrity");
const endContract: unknown = JSON.parse(readFileSync(join(migrationDirectory, "end-contract.json"), "utf8"));
const startContract: unknown = JSON.parse(readFileSync(join(migrationDirectory, "start-contract.json"), "utf8"));

const migrateToStart = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: startContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const seedOutcomes = (database: DatabaseSync) => {
	database
		.prepare('INSERT INTO "piece" ("id", "title", "charter", "expectation", "role") VALUES (?, ?, ?, ?, ?)')
		.run(piece.id, piece.title, piece.charter, piece.expectation, piece.role);
	database.prepare('INSERT INTO "report" ("id", "title", "body") VALUES (?, ?, ?)').run(report.id, report.title, report.body);
	database.prepare('INSERT INTO "artifact" ("id", "title", "uri") VALUES (?, ?, ?)').run(artifact.id, artifact.title, artifact.uri);
};

const rows = (database: DatabaseSync, table: "pieceArtifact" | "pieceReport") => database.prepare(`SELECT * FROM "${table}" ORDER BY 1, 2`).all();

const foreignKeys = (database: DatabaseSync, table: "pieceArtifact" | "pieceReport") =>
	database.prepare(`SELECT "from", "on_delete", "on_update", "table", "to" FROM pragma_foreign_key_list('${table}') ORDER BY "from"`).all();

const piece = {
	charter: "sound the shallows",
	expectation: "the soundings land",
	id: "piece-soundings",
	launchedAt: null,
	parkedAt: null,
	role: "surveyor",
	title: "Soundings",
};

const report = {
	authorAgentId: null,
	body: "depths measured",
	id: "report-soundings",
	title: "Reef soundings",
};

const artifact = {
	authorAgentId: null,
	id: "artifact-chart",
	pieceId: piece.id,
	title: "Reef chart",
	uri: "https://example.test/reef.svg",
};

it.effect("migration preserves valid links behind restrictive constraints", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedOutcomes(sqlite);
			sqlite.prepare('INSERT INTO "pieceReport" ("pieceId", "reportId") VALUES (?, ?)').run(piece.id, report.id);
			sqlite.prepare('INSERT INTO "pieceArtifact" ("pieceId", "artifactId") VALUES (?, ?)').run(piece.id, artifact.id);
		});

		yield* applyMigrations({
			contract: endContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		const migrated = withSqlite(database, (sqlite) => ({
			artifactForeignKeys: foreignKeys(sqlite, "pieceArtifact"),
			artifacts: rows(sqlite, "pieceArtifact"),
			reportForeignKeys: foreignKeys(sqlite, "pieceReport"),
			reports: rows(sqlite, "pieceReport"),
		}));
		expect(migrated.reports).toEqual([{ pieceId: piece.id, reportId: report.id }]);
		expect(migrated.artifacts).toEqual([{ artifactId: artifact.id, pieceId: piece.id }]);
		expect(migrated.reportForeignKeys).toEqual([
			{
				from: "pieceId",
				on_delete: "RESTRICT",
				on_update: "RESTRICT",
				table: "piece",
				to: "id",
			},
			{
				from: "reportId",
				on_delete: "RESTRICT",
				on_update: "RESTRICT",
				table: "report",
				to: "id",
			},
		]);
		expect(migrated.artifactForeignKeys).toEqual([
			{
				from: "artifactId",
				on_delete: "RESTRICT",
				on_update: "RESTRICT",
				table: "artifact",
				to: "id",
			},
			{
				from: "pieceId",
				on_delete: "RESTRICT",
				on_update: "RESTRICT",
				table: "piece",
				to: "id",
			},
		]);
	}),
);
