import { createSqliteControlClient } from "@prisma-next/sqlite/control";
import { Clock, Data, Effect, Schema } from "effect";
import { writeMigrationBackup } from "#adapters/backup.ts";
import contractJson from "#contract.json" with { type: "json" };
import type { DatabaseFilePath } from "#data-dir.ts";

class MigrationFailure extends Data.TaggedError("MigrationFailure")<{
	readonly detail: string;
}> {}

interface MigrationReport {
	readonly applied: ReadonlyArray<string>;
}

interface MigrationTarget {
	readonly contract?: unknown;
	readonly database: DatabaseFilePath;
	readonly migrationsDirectory: string;
}

interface PreparedMigrationTarget extends MigrationTarget {
	readonly contract: unknown;
}

const migrationFailure = (cause: unknown) => new MigrationFailure({ detail: String(cause) });

const ContractStorage = Schema.Struct({ storage: Schema.Struct({ storageHash: Schema.String }) });

const backupBeforeMigrating = (target: PreparedMigrationTarget): Effect.Effect<void, MigrationFailure> =>
	Effect.gen(function* () {
		const contract = yield* Schema.decodeUnknownEffect(ContractStorage)(target.contract).pipe(Effect.mapError(migrationFailure));
		const now = yield* Clock.currentTimeMillis;
		const backup = yield* Effect.try({
			catch: migrationFailure,
			try: () => writeMigrationBackup(target.database, contract.storage.storageHash, new Date(now)),
		});
		if (backup !== undefined) {
			yield* Effect.logInfo("database backed up before migration", backup);
		}
	});

const applyPreparedMigrations = (target: PreparedMigrationTarget): Effect.Effect<MigrationReport, MigrationFailure> =>
	Effect.tryPromise({
		catch: migrationFailure,
		try: async () => {
			const client = createSqliteControlClient({
				connection: target.database,
			});
			await client.connect();
			try {
				const result = await client.migrate({
					contract: target.contract,
					migrationsDir: target.migrationsDirectory,
				});
				if (!result.ok) {
					throw new Error(JSON.stringify(result));
				}
				return {
					applied: result.value.applied.map((entry) => entry.dirName),
				};
			} finally {
				await client.close();
			}
		},
	});

export const applyMigrations = (target: MigrationTarget): Effect.Effect<MigrationReport, MigrationFailure> => {
	const prepared: PreparedMigrationTarget = { ...target, contract: target.contract ?? contractJson };
	return backupBeforeMigrating(prepared).pipe(Effect.andThen(applyPreparedMigrations(prepared)));
};
