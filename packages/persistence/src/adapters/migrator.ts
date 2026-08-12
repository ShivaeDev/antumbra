import { createSqliteControlClient } from "@prisma-next/sqlite/control";
import { Data, Effect } from "effect";
import contractJson from "#contract.json" with { type: "json" };
import type { DatabaseFilePath } from "#data-dir.ts";

export class MigrationFailure extends Data.TaggedError("MigrationFailure")<{
	readonly detail: string;
}> {}

export interface MigrationReport {
	readonly applied: ReadonlyArray<string>;
}

export interface MigrationTarget {
	readonly contract?: unknown;
	readonly database: DatabaseFilePath;
	readonly migrationsDirectory: string;
}

export const applyMigrations = (
	target: MigrationTarget,
): Effect.Effect<MigrationReport, MigrationFailure> =>
	Effect.tryPromise({
		catch: (cause) => new MigrationFailure({ detail: String(cause) }),
		try: async () => {
			const client = createSqliteControlClient({
				connection: target.database,
			});
			await client.connect();
			try {
				const result = await client.migrate({
					contract: target.contract ?? contractJson,
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
