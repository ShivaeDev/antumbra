import { postgresMigration } from "@shivaedev/events/postgresMigration.ts";
import type { PostgresMigrationOptions } from "@shivaedev/sql/migrations.ts";
import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/sql";
import { migration as mail } from "#postgres/mail/migration.ts";
import { migration as pieces } from "#postgres/pieces/migration.ts";
import { migration as voyages } from "#postgres/voyages/migration.ts";

export const migrations = {
	loader: Migrator.fromRecord({
		"1_storage_namespace": Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			yield* sql`create schema antumbra`;
		}),
		"2_events": postgresMigration,
		"3_voyages": voyages,
		"4_pieces": pieces,
		"5_mail": mail,
	}),
	lockTimeout: "5 seconds",
} satisfies PostgresMigrationOptions<never>;
