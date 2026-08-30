import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { prepareArtifactCustodyMigration } from "#adapters/artifact-custody-preflight.ts";
import { applyMigrations, applyPreparedMigrations } from "#adapters/migrator.ts";
import contract from "#contract.json" with { type: "json" };
import {
	artifactHasUri,
	fixture,
	installLegacyArtifact,
	migrateToPredecessor,
	removeStagedProof,
	stageCount,
} from "#test/artifact-custody-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const requiredFields = [
	["manifest", "predecessor"],
	["manifest", "count"],
	["manifest", "snapshot"],
	["item", "id"],
	["item", "legacyUri"],
	["item", "snapshot"],
	["item", "byteSize"],
	["item", "digest"],
	["item", "basename"],
] as const;

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

it.effect("stages idempotently across a crash before ordinary migration", () =>
	Effect.gen(function* () {
		const target = fixture();
		yield* migrateToPredecessor(target.database);
		installLegacyArtifact(target.database, target.artifactsRoot);
		const preflight = { ...target };

		yield* Effect.sync(() => prepareArtifactCustodyMigration(preflight));
		expect(stageCount(target.database)).toBe(2);
		yield* Effect.sync(() => prepareArtifactCustodyMigration(preflight));
		expect(stageCount(target.database)).toBe(2);
		yield* applyMigrations({
			...target,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		expect(stageCount(target.database)).toBe(0);
	}),
);

it.effect("ordinary migration rejects stale or incomplete staging", () =>
	Effect.gen(function* () {
		const target = fixture();
		yield* migrateToPredecessor(target.database);
		installLegacyArtifact(target.database, target.artifactsRoot);
		yield* Effect.sync(() => prepareArtifactCustodyMigration({ ...target }));
		const database = new DatabaseSync(target.database);
		try {
			database
				.prepare(
					`UPDATE "appMeta" SET "value" = json_set("value", '$.legacyUri', 'file:///stale.md') WHERE "key" LIKE 'migration:artifact-custody:item:%'`,
				)
				.run();
		} finally {
			database.close();
		}

		const failure = yield* Effect.flip(
			applyPreparedMigrations({
				contract,
				database: target.database,
				migrationsDirectory: packagedMigrationsDirectory,
			}),
		);
		expect(failure.detail).toContain("artifact_custody");
		expect(stageCount(target.database)).toBe(2);
	}),
);

// why: staging was once pinned to the exact contract custody itself ends at,
// so appending any later migration silently disabled the upgrade path for the
// databases that still needed it. The premise worth pinning is that the chain
// does continue past custody — without asserting it this test would quietly
// degrade into a copy of the happy path the day custody became the tail again.
it.effect("stages custody though the chain continues past it", () =>
	Effect.gen(function* () {
		expect(readdirSync(join(packagedMigrationsDirectory, "app")).filter((name) => name > "20260818T1538_artifact_custody")).not.toHaveLength(0);
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
		} finally {
			database.close();
		}
		expect(artifactHasUri(target.database)).toBe(false);
		expect(stageCount(target.database)).toBe(0);
	}),
);

for (const [key, field] of requiredFields) {
	it.effect(`requires staged custody proof field ${key}.${field}`, () =>
		Effect.gen(function* () {
			const target = fixture();
			yield* migrateToPredecessor(target.database);
			installLegacyArtifact(target.database, target.artifactsRoot);
			yield* Effect.sync(() => prepareArtifactCustodyMigration({ ...target }));
			removeStagedProof(target.database, key, field);

			yield* Effect.flip(
				applyPreparedMigrations({
					contract,
					database: target.database,
					migrationsDirectory: packagedMigrationsDirectory,
				}),
			);
			expect(artifactHasUri(target.database), `${key}.${field}`).toBe(true);
			expect(stageCount(target.database), `${key}.${field}`).toBe(2);
		}),
	);
}
