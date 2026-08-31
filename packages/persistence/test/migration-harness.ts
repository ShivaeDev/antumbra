import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll } from "vitest";
import { brandDatabaseFilePath, type DatabaseFilePath } from "#data-dir.ts";

const directories: string[] = [];

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

export const freshMigrationDatabase = (): DatabaseFilePath => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-migration-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

export const withSqlite = <A>(path: string, act: (database: DatabaseSync) => A): A => {
	const database = new DatabaseSync(path);
	try {
		return act(database);
	} finally {
		database.close();
	}
};
