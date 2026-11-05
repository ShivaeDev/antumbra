import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

export class UnsupportedPostgresVersion extends Schema.TaggedError<UnsupportedPostgresVersion>()("UnsupportedPostgresVersion", {
	observed: Schema.Number,
}) {
	override get message() {
		return `Antumbra requires PostgreSQL 18 or newer; the configured server reports ${Math.floor(this.observed / 10000)}.${this.observed % 10000}. Set ANTUMBRA_POSTGRES_BIN_DIRECTORY to a compatible installed binary directory.`;
	}
}
export const compatiblePostgres = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const [version] = yield* sql`select current_setting('server_version_num')::integer as version`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.NonEmptyArray(Schema.Struct({ version: Schema.Number })))),
	);
	if (version.version < 180000) return yield* new UnsupportedPostgresVersion({ observed: version.version });
});
