import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { makeDatabaseIt } from "@shivaedev/effect-prisma/testing";
import { brandDatabaseFilePath, type DatabaseFilePath } from "#data-dir.ts";
import { Database } from "#database.ts";
import { PersistenceLive } from "#layer.ts";

export const packagedMigrationsDirectory = fileURLToPath(
	new URL("../migrations", import.meta.url),
);

export interface TemporaryPersistence {
	readonly database: DatabaseFilePath;
	readonly layer: ReturnType<typeof PersistenceLive>;
	readonly remove: () => void;
}

// why: the harness mints its own throwaway directory and accepts no path
// input, so a test cannot be pointed at a live instance's data directory —
// isolation is structural, not a convention.
export const temporaryPersistence = (): TemporaryPersistence => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-persistence-"));
	const database = brandDatabaseFilePath(join(directory, "antumbra.db"));
	return {
		database,
		layer: PersistenceLive({
			database,
			migrationsDirectory: packagedMigrationsDirectory,
		}),
		remove: () => rmSync(directory, { force: true, recursive: true }),
	};
};

export const persistenceIt = () => {
	const temporary = temporaryPersistence();
	const harness = makeDatabaseIt({
		database: Database,
		layer: temporary.layer,
	});
	harness.afterAll(temporary.remove);
	return harness;
};

export const deleteTestAgent = (
	databasePath: DatabaseFilePath,
	agentId: string,
) => {
	const database = new DatabaseSync(databasePath);
	database.prepare("DELETE FROM agent WHERE id = ?").run(agentId);
	database.close();
};

export const corruptTestBoardEntry = (
	databasePath: DatabaseFilePath,
	column: "kind" | "precedence" | "register",
	value: string,
) => {
	const statements = {
		kind: 'UPDATE "boardEntry" SET "kind" = ?',
		precedence: 'UPDATE "boardEntry" SET "precedence" = ?',
		register: 'UPDATE "boardEntry" SET "register" = ?',
	};
	const database = new DatabaseSync(databasePath);
	database.prepare(statements[column]).run(value);
	database.close();
};
