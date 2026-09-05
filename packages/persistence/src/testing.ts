import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDatabaseIt } from "@shivaedev/effect-prisma/testing";
import { Effect, Layer } from "effect";
import { brandDatabaseFilePath, type DatabaseFilePath } from "#data-dir.ts";
import { Database } from "#database.ts";
import { PersistenceLive } from "#layer.ts";

export {
	allowTestChangeUpdates,
	allowTestSessionOpenedWrites,
	rejectTestChangeUpdates,
	rejectTestSessionMessageWrites,
	rejectTestSessionOpenedWrites,
} from "#testing/refusals.ts";

export const packagedMigrationsDirectory = fileURLToPath(new URL("../migrations", import.meta.url));

export interface TemporaryPersistence {
	readonly database: DatabaseFilePath;
	readonly layer: ReturnType<typeof PersistenceLive>;
	readonly remove: () => void;
}

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

export const acquireTemporaryPersistence = Effect.acquireRelease(Effect.sync(temporaryPersistence), (temporary) => Effect.sync(temporary.remove));

export const it = makeDatabaseIt({
	database: Database,
	layer: Layer.unwrap(acquireTemporaryPersistence.pipe(Effect.map((temporary) => temporary.layer))),
});
