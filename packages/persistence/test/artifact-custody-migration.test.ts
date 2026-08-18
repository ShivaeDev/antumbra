import { createHash } from "node:crypto";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { prepareArtifactCustodyMigration } from "#adapters/artifact-custody-preflight.ts";
import {
	applyMigrations,
	applyPreparedMigrations,
} from "#adapters/migrator.ts";
import contract from "#contract.json" with { type: "json" };
import { brandDatabaseFilePath } from "#data-dir.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const predecessor: unknown = JSON.parse(
	readFileSync(
		fileURLToPath(
			new URL(
				"../migrations/app/20260818T1538_artifact_custody/start-contract.json",
				import.meta.url,
			),
		),
		"utf8",
	),
);

const directories: string[] = [];

it.afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const fixture = () => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-custody-migration-"));
	directories.push(directory);
	const configuredRoot = join(directory, "artifacts");
	mkdirSync(configuredRoot);
	const artifactsRoot = realpathSync(configuredRoot);
	return {
		artifactsRoot,
		database: brandDatabaseFilePath(join(directory, "antumbra.db")),
	};
};

const migrateToPredecessor = (
	database: ReturnType<typeof fixture>["database"],
) =>
	applyMigrations({
		contract: predecessor,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

const installLegacyArtifact = (
	databasePath: ReturnType<typeof fixture>["database"],
	artifactsRoot: string,
	options: {
		readonly bytes?: Uint8Array;
		readonly id?: string;
		readonly uri?: string;
	} = {},
) => {
	const bytes = options.bytes ?? new TextEncoder().encode("# Reef\n");
	const id = options.id ?? "artifact-reef";
	const digest = createHash("sha256").update(bytes).digest("hex");
	const directory = join(artifactsRoot, digest);
	mkdirSync(directory, { recursive: true });
	const destination = join(directory, `${id}.md`);
	writeFileSync(destination, bytes);
	const database = new DatabaseSync(databasePath);
	try {
		database
			.prepare(
				`INSERT OR IGNORE INTO "piece" ("id", "title", "charter", "expectation", "role") VALUES ('piece-reef', 'Reef', 'chart', 'chart lands', 'cartographer')`,
			)
			.run();
		database
			.prepare(
				`INSERT INTO "artifact" ("id", "pieceId", "title", "uri") VALUES (?, 'piece-reef', ?, ?)`,
			)
			.run(id, id, options.uri ?? pathToFileURL(destination).toString());
	} finally {
		database.close();
	}
	return { basename: `${id}.md`, byteSize: bytes.length, digest, id };
};

const stageCount = (databasePath: ReturnType<typeof fixture>["database"]) => {
	const database = new DatabaseSync(databasePath);
	try {
		const row = database
			.prepare(
				`SELECT COUNT(*) AS "count" FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest' OR "key" LIKE 'migration:artifact-custody:item:%'`,
			)
			.get();
		return Number(row?.count);
	} finally {
		database.close();
	}
};

const removeStagedProof = (
	databasePath: ReturnType<typeof fixture>["database"],
	key: "item" | "manifest",
	field: string,
) => {
	const database = new DatabaseSync(databasePath);
	try {
		const selector =
			key === "manifest"
				? `"key" = 'migration:artifact-custody:manifest'`
				: `"key" LIKE 'migration:artifact-custody:item:%'`;
		database
			.prepare(
				`UPDATE "appMeta" SET "value" = json_remove("value", ?) WHERE ${selector}`,
			)
			.run(`$.${field}`);
	} finally {
		database.close();
	}
};

const artifactHasUri = (
	databasePath: ReturnType<typeof fixture>["database"],
): boolean => {
	const database = new DatabaseSync(databasePath);
	try {
		return database
			.prepare(`PRAGMA table_info('artifact')`)
			.all()
			.some((row) => row.name === "uri");
	} finally {
		database.close();
	}
};

it.effect(
	"backfills only verified canonical CAS metadata and removes URI",
	() =>
		Effect.gen(function* () {
			const target = fixture();
			yield* migrateToPredecessor(target.database);
			const artifact = installLegacyArtifact(
				target.database,
				target.artifactsRoot,
			);

			yield* applyMigrations({
				...target,
				migrationsDirectory: packagedMigrationsDirectory,
			});

			const database = new DatabaseSync(target.database);
			try {
				expect(
					database.prepare(`SELECT * FROM "artifact"`).get(),
				).toMatchObject(artifact);
				expect(
					database.prepare(`PRAGMA table_info('artifact')`).all(),
				).not.toEqual(
					expect.arrayContaining([expect.objectContaining({ name: "uri" })]),
				);
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
			expect(database.prepare(`PRAGMA table_info('artifact')`).all()).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: "uri" })]),
			);
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
		const preflight = { ...target, contract };

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
		yield* Effect.sync(() =>
			prepareArtifactCustodyMigration({ ...target, contract }),
		);
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

it.effect("requires every staged custody proof field", () =>
	Effect.gen(function* () {
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
		for (const [key, field] of requiredFields) {
			const target = fixture();
			yield* migrateToPredecessor(target.database);
			installLegacyArtifact(target.database, target.artifactsRoot);
			yield* Effect.sync(() =>
				prepareArtifactCustodyMigration({ ...target, contract }),
			);
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
		}
	}),
);
