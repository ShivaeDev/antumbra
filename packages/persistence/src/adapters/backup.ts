import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { currentStorageHash } from "#adapters/storage-marker.ts";
import type { DatabaseFilePath } from "#data-dir.ts";

const KEPT_BACKUPS = 5;

export interface MigrationBackup {
	readonly from: string;
	readonly path: string;
	readonly to: string;
}

const compactTimestamp = (now: Date) => now.toISOString().replaceAll(/[-:]|\.\d{3}/g, "");

const shortHash = (hash: string) => hash.slice(hash.indexOf(":") + 1).slice(0, 8);

const backupName = (now: Date, from: string) => `antumbra-${compactTimestamp(now)}-${shortHash(from)}.db`;

const isBackupName = (name: string) => name.startsWith("antumbra-") && name.endsWith(".db");

export const writeMigrationBackup = (database: DatabaseFilePath, to: string, now: Date): MigrationBackup | undefined => {
	const connection = new DatabaseSync(database);
	try {
		const from = currentStorageHash(connection);
		if (from === undefined || from === to) {
			return undefined;
		}
		const directory = join(dirname(database), "backups");
		mkdirSync(directory, { recursive: true });
		const path = join(directory, backupName(now, from));
		connection.prepare("VACUUM INTO ?").run(path);
		for (const stale of readdirSync(directory).filter(isBackupName).sort().slice(0, -KEPT_BACKUPS)) {
			rmSync(join(directory, stale));
		}
		return { from, path, to };
	} finally {
		connection.close();
	}
};
