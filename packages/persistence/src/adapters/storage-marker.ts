import type { DatabaseSync } from "node:sqlite";

export const currentStorageHash = (database: DatabaseSync): string | undefined => {
	const marker = database.prepare(`SELECT 1 AS "found" FROM sqlite_master WHERE type = 'table' AND name = '_prisma_marker'`).get();
	if (marker === undefined) {
		return undefined;
	}
	const row = database.prepare(`SELECT "core_hash" FROM "_prisma_marker" WHERE "space" = 'app'`).get();
	return typeof row?.core_hash === "string" ? row.core_hash : undefined;
};
