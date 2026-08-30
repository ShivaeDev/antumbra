import { Effect, Layer } from "effect";
import { applyMigrations } from "#adapters/migrator.ts";
import type { DatabaseFilePath } from "#data-dir.ts";
import { Database } from "#database.ts";

export interface PersistenceOptions {
	readonly artifactsRoot: string;
	readonly database: DatabaseFilePath;
	readonly migrationsDirectory: string;
}

// why: migrations must complete before the client connects and applies
// connect-time pragmas, so the database layer is unwrapped from the
// migration effect instead of being merged beside it.
export const PersistenceLive = (options: PersistenceOptions) =>
	Layer.unwrap(Effect.map(applyMigrations(options), () => Database.layer({ path: options.database })));
