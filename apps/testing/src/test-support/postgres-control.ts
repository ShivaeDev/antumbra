import { instance } from "@antumbra/server-storage/instance.ts";
import { migrations } from "@antumbra/server-storage/migrations.ts";
import { makeChannel } from "@shivaedev/changes/channel.ts";
import { migrateAppPostgres } from "@shivaedev/local-postgres/server/migrateAppPostgres.ts";
import { migratePostgres } from "@shivaedev/sql/migrations.ts";
import { postgresLayer } from "@shivaedev/sql/postgresLayer.ts";
import { PostgresTestDatabase } from "@shivaedev/test-sql/server/database.ts";
import { withTestTransaction } from "@shivaedev/test-sql/server/withTestTransaction.ts";
import { Context, Data, Effect, Exit, FileSystem, Layer, Redacted, Schema, Scope } from "effect";
import { SqlClient } from "effect/sql";

const Entries = Schema.Array(Schema.Struct({ value: Schema.String }));
class Rollback extends Data.TaggedError("PostgresStoryRollback") {}
const entries = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select value from composition_entries order by value`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Entries)));
});

const prepareEntries = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table composition_entries (value text primary key)`;
});

const insert = Effect.fn("PostgresStory.insert")(function* (value: string) {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`insert into composition_entries values (${value})`;
});

export const createIsolationEngine = Effect.fn("PostgresStory.createIsolation")(function* () {
	const database = yield* PostgresTestDatabase;
	let services = yield* database.isolated;
	yield* prepareEntries.pipe(Effect.provideContext(services));
	const published: string[] = [];
	const changes = makeChannel<string, SqlClient.SqlClient>({
		name: "PostgresStory",
		owner: Effect.map(SqlClient.SqlClient, (sql) => sql.transactionService),
		key: (value) => value,
		publish: (values) => Effect.sync(() => published.push(...values)),
	});
	return {
		published: () => [...published],
		storedEntries: () => entries.pipe(Effect.provideContext(services)),
		store: (value: string) => insert(value).pipe(Effect.provideContext(services)),
		rollback: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(withTestTransaction, Effect.provideContext(services)),
		openFreshDatabase: () =>
			Effect.gen(function* () {
				services = yield* database.isolated;
				yield* prepareEntries.pipe(Effect.provideContext(services));
			}),
		transaction: (value: string, outcome: "commit" | "rollback") =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				const write = insert(value).pipe(
					Effect.andThen(changes.record([value])),
					Effect.andThen(outcome === "rollback" ? Effect.fail(new Rollback()) : Effect.void),
				);
				yield* write.pipe(
					changes.within(sql.withTransaction),
					Effect.catchTag("PostgresStoryRollback", () => Effect.void),
				);
			}).pipe(Effect.provideContext(services)),
	};
});

const open = Effect.fn("PostgresStory.open")(function* (root: string) {
	return yield* Effect.gen(function* () {
		const postgres = yield* instance(root);
		const services = yield* Layer.build(postgresLayer(Redacted.make(postgres.connectionUrl)));
		yield* migrateAppPostgres(postgres, migratePostgres(migrations).pipe(Effect.provideContext(services)));
		return { postgres, services };
	});
});

export const createInstanceEngine = Effect.fn("PostgresStory.createInstance")(function* () {
	const fs = yield* FileSystem.FileSystem;
	const root = yield* fs.makeTempDirectoryScoped();
	let scope = yield* Scope.make();
	yield* Effect.addFinalizer(() => Scope.close(scope, Exit.void));
	let running = yield* open(root).pipe(Effect.provideService(Scope.Scope, scope));
	yield* prepareEntries.pipe(Effect.provideContext(running.services));
	return {
		storedEntries: () => entries.pipe(Effect.provideContext(running.services)),
		store: (value: string) => insert(value).pipe(Effect.provideContext(running.services)),
		connection: () => running.postgres.connectionUrl,
		migrations: () => {
			const sql = Context.get(running.services, SqlClient.SqlClient);
			return sql`select name from effect_sql_migrations order by migration_id`;
		},
		restart: Effect.gen(function* () {
			yield* Scope.close(scope, Exit.void);
			scope = yield* Scope.make();
			running = yield* open(root).pipe(Effect.provideService(Scope.Scope, scope));
		}),
	};
});
