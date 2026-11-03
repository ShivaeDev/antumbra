import { postgresMigration } from "@shivaedev/events/postgresMigration.ts";
import type { PostgresMigrationOptions } from "@shivaedev/sql/migrations.ts";
import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/sql";
import { migration as voyages } from "#postgres/voyages/migration.ts";

export const migrations = {
	loader: Migrator.fromRecord({
		"1_storage_namespace": Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			yield* sql`create schema antumbra`;
		}),
		"2_events": postgresMigration,
		"3_voyages": voyages,
	}),
	lockTimeout: "5 seconds",
} satisfies PostgresMigrationOptions<never>;
