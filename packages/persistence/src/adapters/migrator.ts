import { createSqliteControlClient } from "@prisma-next/sqlite/control";
import { Clock, Data, Effect, Schema } from "effect";
import { prepareArtifactCustodyMigration } from "#adapters/artifact-custody-preflight.ts";
import { backupBeforeMigration } from "#adapters/backup.ts";
import contractJson from "#contract.json" with { type: "json" };
import type { DatabaseFilePath } from "#data-dir.ts";

class MigrationFailure extends Data.TaggedError("MigrationFailure")<{
	readonly detail: string;
}> {}

interface MigrationReport {
	readonly applied: ReadonlyArray<string>;
}

interface MigrationTarget {
	readonly artifactsRoot?: string;
	readonly contract?: unknown;
	readonly database: DatabaseFilePath;
	readonly migrationsDirectory: string;
}

interface PreparedMigrationTarget extends MigrationTarget {
	readonly contract: unknown;
}

const migrationFailure = (cause: unknown) => new MigrationFailure({ detail: String(cause) });

const storageHashOf = Schema.decodeUnknownSync(Schema.Struct({ storage: Schema.Struct({ storageHash: Schema.String }) }));

const backupBeforeMigrating = (target: PreparedMigrationTarget): Effect.Effect<void, MigrationFailure> =>
	Clock.currentTimeMillis.pipe(
		Effect.flatMap((now) =>
			Effect.try({
				catch: migrationFailure,
				try: () => backupBeforeMigration(target.database, storageHashOf(target.contract).storage.storageHash, new Date(now)),
			}),
		),
		Effect.flatMap((backup) => (backup === undefined ? Effect.void : Effect.logInfo("database backed up before migration", backup))),
	);

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
	return Effect.try({
		catch: migrationFailure,
		try: () =>
			prepareArtifactCustodyMigration({
				...(target.artifactsRoot === undefined ? {} : { artifactsRoot: target.artifactsRoot }),
				database: target.database,
			}),
	}).pipe(Effect.andThen(backupBeforeMigrating(prepared)), Effect.andThen(applyPreparedMigrations(prepared)));
};
