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
import { it } from "@effect/vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import { brandDatabaseFilePath } from "#data-dir.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

export const predecessor: unknown = JSON.parse(
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

export const fixture = () => {
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

export type CustodyFixture = ReturnType<typeof fixture>;

export const migrateToPredecessor = (database: CustodyFixture["database"]) =>
	applyMigrations({
		contract: predecessor,
		database,
		migrationsDirectory: packagedMigrationsDirectory,
	});

export const installLegacyArtifact = (
	databasePath: CustodyFixture["database"],
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

export const stageCount = (databasePath: CustodyFixture["database"]) => {
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

export const removeStagedProof = (
	databasePath: CustodyFixture["database"],
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

export const artifactHasUri = (
	databasePath: CustodyFixture["database"],
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
