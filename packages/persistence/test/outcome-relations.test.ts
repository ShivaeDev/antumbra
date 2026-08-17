import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { applyMigrations } from "@antumbra/persistence";
import {
	packagedMigrationsDirectory,
	persistenceIt,
	type TemporaryPersistence,
} from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { afterAll } from "vitest";
import { brandDatabaseFilePath } from "#data-dir.ts";

const it = persistenceIt();
const directories: string[] = [];
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationDirectory = join(
	packageRoot,
	"migrations",
	"app",
	"20260817T0543_outcome_relational_integrity",
);
const endContract: unknown = JSON.parse(
	readFileSync(join(migrationDirectory, "end-contract.json"), "utf8"),
);
const startContract: unknown = JSON.parse(
	readFileSync(join(migrationDirectory, "start-contract.json"), "utf8"),
);

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const freshDatabase = (): TemporaryPersistence["database"] => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-outcome-migration-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

const withSqlite = <A>(path: string, act: (database: DatabaseSync) => A): A => {
	const database = new DatabaseSync(path);
	try {
		return act(database);
	} finally {
		database.close();
	}
};

const migrateToStart = (database: TemporaryPersistence["database"]) =>
	applyMigrations({
		contract: startContract,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const seedOutcomes = (database: DatabaseSync) => {
	database
		.prepare(
			'INSERT INTO "piece" ("id", "title", "charter", "expectation", "role") VALUES (?, ?, ?, ?, ?)',
		)
		.run(piece.id, piece.title, piece.charter, piece.expectation, piece.role);
	database
		.prepare('INSERT INTO "report" ("id", "title", "body") VALUES (?, ?, ?)')
		.run(report.id, report.title, report.body);
	database
		.prepare('INSERT INTO "artifact" ("id", "title", "uri") VALUES (?, ?, ?)')
		.run(artifact.id, artifact.title, artifact.uri);
};

const rows = (database: DatabaseSync, table: "pieceArtifact" | "pieceReport") =>
	database.prepare(`SELECT * FROM "${table}" ORDER BY 1, 2`).all();

const foreignKeys = (
	database: DatabaseSync,
	table: "pieceArtifact" | "pieceReport",
) =>
	database
		.prepare(
			`SELECT "from", "on_delete", "on_update", "table", "to" FROM pragma_foreign_key_list('${table}') ORDER BY "from"`,
		)
		.all();

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
	title: "Reef chart",
	uri: "https://example.test/reef.svg",
};

it.effectDB("rejects every orphan Piece outcome relation", function* (db) {
	yield* db.Piece.create(piece);
	yield* db.Report.create(report);
	yield* db.Artifact.create(artifact);

	const failures = yield* Effect.all([
		Effect.flip(
			db.PieceReport.create({ pieceId: "missing-piece", reportId: report.id }),
		),
		Effect.flip(
			db.PieceReport.create({ pieceId: piece.id, reportId: "missing-report" }),
		),
		Effect.flip(
			db.PieceArtifact.create({
				artifactId: artifact.id,
				pieceId: "missing-piece",
			}),
		),
		Effect.flip(
			db.PieceArtifact.create({
				artifactId: "missing-artifact",
				pieceId: piece.id,
			}),
		),
	]);

	for (const failure of failures) {
		expect(failure._tag).toBe("PrismaError");
	}
	expect(yield* db.PieceReport.all()).toEqual([]);
	expect(yield* db.PieceArtifact.all()).toEqual([]);
});

it.effect("migration refuses a historical orphan Report link unchanged", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		const before = withSqlite(database, (sqlite) => {
			seedOutcomes(sqlite);
			sqlite
				.prepare(
					'INSERT INTO "pieceReport" ("pieceId", "reportId") VALUES (?, ?), (?, ?), (?, ?)',
				)
				.run(
					piece.id,
					report.id,
					"missing-piece",
					report.id,
					piece.id,
					"missing-report",
				);
			return rows(sqlite, "pieceReport");
		});

		const failure = yield* Effect.flip(
			applyMigrations({
				contract: endContract,
				database,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(failure.detail).toContain("Foreign key integrity check failed");
		expect(failure.detail).toContain("2 violation(s)");
		expect(
			withSqlite(database, (sqlite) => rows(sqlite, "pieceReport")),
		).toEqual(before);
		expect(
			withSqlite(database, (sqlite) => foreignKeys(sqlite, "pieceReport")),
		).toEqual([]);
		expect(
			withSqlite(database, (sqlite) => foreignKeys(sqlite, "pieceArtifact")),
		).toEqual([]);
	}),
);

it.effect("migration refuses a historical orphan Artifact link unchanged", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* migrateToStart(database);
		const before = withSqlite(database, (sqlite) => {
			seedOutcomes(sqlite);
			sqlite
				.prepare(
					'INSERT INTO "pieceArtifact" ("pieceId", "artifactId") VALUES (?, ?), (?, ?), (?, ?)',
				)
				.run(
					piece.id,
					artifact.id,
					"missing-piece",
					artifact.id,
					piece.id,
					"missing-artifact",
				);
			return rows(sqlite, "pieceArtifact");
		});

		const failure = yield* Effect.flip(
			applyMigrations({
				contract: endContract,
				database,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(failure.detail).toContain("Foreign key integrity check failed");
		expect(failure.detail).toContain("2 violation(s)");
		expect(
			withSqlite(database, (sqlite) => rows(sqlite, "pieceArtifact")),
		).toEqual(before);
		expect(
			withSqlite(database, (sqlite) => foreignKeys(sqlite, "pieceArtifact")),
		).toEqual([]);
		expect(
			withSqlite(database, (sqlite) => foreignKeys(sqlite, "pieceReport")),
		).toEqual([]);
	}),
);

it.effect(
	"migration preserves valid links behind restrictive constraints",
	() =>
		Effect.gen(function* () {
			const database = freshDatabase();
			yield* migrateToStart(database);
			withSqlite(database, (sqlite) => {
				seedOutcomes(sqlite);
				sqlite
					.prepare(
						'INSERT INTO "pieceReport" ("pieceId", "reportId") VALUES (?, ?)',
					)
					.run(piece.id, report.id);
				sqlite
					.prepare(
						'INSERT INTO "pieceArtifact" ("pieceId", "artifactId") VALUES (?, ?)',
					)
					.run(piece.id, artifact.id);
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
			expect(migrated.reports).toEqual([
				{ pieceId: piece.id, reportId: report.id },
			]);
			expect(migrated.artifacts).toEqual([
				{ artifactId: artifact.id, pieceId: piece.id },
			]);
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
