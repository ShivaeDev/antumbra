import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { postgresTests } from "#postgres/testing.ts";

export const checkPostgresFixture = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const namespaces = yield* sql`select schema_name as name from information_schema.schemata where schema_name = 'antumbra'`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.NonEmptyArray(Schema.Struct({ name: Schema.String })))),
	);
	return { namespaces };
}).pipe(withIsolatedDatabase, Effect.provide(postgresTests), Effect.scoped);
