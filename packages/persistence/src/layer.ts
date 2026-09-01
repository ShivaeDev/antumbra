import { Effect, Layer } from "effect";
import { applyMigrations } from "#adapters/migrator.ts";
import type { DatabaseFilePath } from "#data-dir.ts";
import { Database } from "#database.ts";

interface PersistenceOptions {
	readonly artifactsRoot: string;
	readonly database: DatabaseFilePath;
	readonly migrationsDirectory: string;
}

// Migrations must finish before the client applies connect-time pragmas.
export const PersistenceLive = (options: PersistenceOptions) =>
	Layer.unwrap(Effect.map(applyMigrations(options), () => Database.layer({ path: options.database })));
