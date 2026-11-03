import type { PostgresMigrationOptions } from "@shivaedev/sql/migrations.ts";
import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/sql";

export const migrations = {
	loader: Migrator.fromRecord({
		"1_storage_namespace": Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			yield* sql`create schema antumbra`;
		}),
	}),
	lockTimeout: "5 seconds",
} satisfies PostgresMigrationOptions<never>;
