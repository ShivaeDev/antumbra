import { DatabaseSync } from "node:sqlite";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { applyMigrations } from "#adapters/migrator.ts";
import { fixture, installLegacyArtifact, migrateToPredecessor, stageCount } from "#test/artifact-custody-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

it.effect("backfills only verified canonical CAS metadata and removes URI", () =>
	Effect.gen(function* () {
		const target = fixture();
		yield* migrateToPredecessor(target.database);
		const artifact = installLegacyArtifact(target.database, target.artifactsRoot);

		yield* applyMigrations({
			...target,
			migrationsDirectory: packagedMigrationsDirectory,
		});

		const database = new DatabaseSync(target.database);
		try {
			expect(database.prepare(`SELECT * FROM "artifact"`).get()).toMatchObject(artifact);
			expect(database.prepare(`PRAGMA table_info('artifact')`).all()).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "uri" })]));
			expect(stageCount(target.database)).toBe(0);
		} finally {
			database.close();
		}
	}),
);

it.effect("refuses external legacy custody with ids and zero mutation", () =>
	Effect.gen(function* () {
		const target = fixture();
		yield* migrateToPredecessor(target.database);
		installLegacyArtifact(target.database, target.artifactsRoot, {
			id: "artifact-external",
			uri: "https://example.test/reef.md",
		});

		const failure = yield* Effect.flip(
			applyMigrations({
				...target,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(failure.detail).toContain("artifact-external");
		expect(failure.detail).toContain("external or noncanonical");
		expect(stageCount(target.database)).toBe(0);

		const database = new DatabaseSync(target.database);
		try {
			expect(database.prepare(`PRAGMA table_info('artifact')`).all()).toEqual(expect.arrayContaining([expect.objectContaining({ name: "uri" })]));
		} finally {
			database.close();
		}
	}),
);
