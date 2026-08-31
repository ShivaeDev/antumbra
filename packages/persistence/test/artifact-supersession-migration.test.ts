import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { applyMigrations } from "@antumbra/persistence";
import { packagedMigrationsDirectory, type TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { freshMigrationDatabase as freshDatabase, withSqlite } from "#test/migration-harness.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationDirectory = join(packageRoot, "migrations", "app", "20260818T0003_artifact_supersession");
const startContract: unknown = JSON.parse(readFileSync(join(migrationDirectory, "start-contract.json"), "utf8"));
const endContract: unknown = JSON.parse(readFileSync(join(migrationDirectory, "end-contract.json"), "utf8"));

const migrateToStart = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: startContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const seedPiece = (database: DatabaseSync, id: string) =>
	database
		.prepare('INSERT INTO "piece" ("id", "title", "charter", "expectation", "role") VALUES (?, ?, ?, ?, ?)')
		.run(id, id, "draw", "a chart lands", "cartographer");

const seedArtifact = (database: DatabaseSync) =>
	database.prepare('INSERT INTO "artifact" ("id", "title", "uri") VALUES (?, ?, ?)').run("artifact-chart", "chart", "https://example.test/chart.svg");

const pieceArtifactRows = (database: DatabaseSync) => database.prepare('SELECT * FROM "pieceArtifact" ORDER BY "pieceId"').all();

const seedInvalidProvenance = (database: DatabaseSync, provenance: "ambiguous" | "missing") => {
	seedPiece(database, "piece-one");
	seedArtifact(database);
	if (provenance === "missing") {
		return;
	}
	seedPiece(database, "piece-two");
	database
		.prepare('INSERT INTO "pieceArtifact" ("pieceId", "artifactId") VALUES (?, ?), (?, ?)')
		.run("piece-one", "artifact-chart", "piece-two", "artifact-chart");
};

const supersessionTableCount = (database: DatabaseSync) =>
	database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = ? AND name = ?").get("table", "artifactSupersession");

const pieceArtifactTableCount = (database: DatabaseSync) =>
	database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = ? AND name = ?").get("table", "pieceArtifact");

const assertInvalidProvenanceMigration = (provenance: "ambiguous" | "missing") =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		const before = withSqlite(database, (sqlite) => {
			seedInvalidProvenance(sqlite, provenance);
			return pieceArtifactRows(sqlite);
		});
		const result = yield* Effect.exit(
			applyMigrations({
				contract: endContract,
				database,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(result._tag).toBe("Failure");
		expect(withSqlite(database, pieceArtifactRows)).toEqual(before);
		expect(withSqlite(database, supersessionTableCount)).toEqual({ count: 0 });
	});

it.effect("refuses missing or ambiguous producing-Piece provenance unchanged", () =>
	Effect.forEach(["missing", "ambiguous"] as const, assertInvalidProvenanceMigration),
);

it.effect("moves valid provenance onto Artifact and removes the join table", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		withSqlite(database, (sqlite) => {
			seedPiece(sqlite, "piece-one");
			seedPiece(sqlite, "piece-two");
			seedArtifact(sqlite);
			sqlite.prepare('INSERT INTO "pieceArtifact" ("pieceId", "artifactId") VALUES (?, ?)').run("piece-one", "artifact-chart");
		});

		yield* applyMigrations({
			contract: endContract,
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		expect(
			withSqlite(database, (sqlite) =>
				sqlite.prepare('SELECT "pieceId", "supersededByArtifactId" FROM "artifact" WHERE "id" = ?').get("artifact-chart"),
			),
		).toEqual({
			pieceId: "piece-one",
			supersededByArtifactId: null,
		});
		expect(withSqlite(database, pieceArtifactTableCount)).toEqual({
			count: 0,
		});
		expect(withSqlite(database, supersessionTableCount)).toEqual({
			count: 0,
		});
	}),
);
