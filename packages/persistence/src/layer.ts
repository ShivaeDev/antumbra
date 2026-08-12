import { Effect, Layer } from "effect";
import { applyMigrations } from "#adapters/migrator.js";
import type { DatabaseFilePath } from "#data-dir.js";
import { Database } from "#database.js";
import { WriterLive } from "#writer.js";

export interface PersistenceOptions {
	readonly database: DatabaseFilePath;
	readonly migrationsDirectory: string;
}

// why: migrations must complete before the client connects and applies
// connect-time pragmas, so the database layer is unwrapped from the
// migration effect instead of being merged beside it.
export const PersistenceLive = (options: PersistenceOptions) =>
	WriterLive.pipe(
		Layer.provideMerge(
			Layer.unwrap(
				Effect.map(applyMigrations(options), () =>
					Database.layer({ path: options.database }),
				),
			),
		),
	);
