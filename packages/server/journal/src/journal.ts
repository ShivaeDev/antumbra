import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Context, Effect, Layer } from "effect";
import { Reactivity, layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { type AppDefinition, registryOf } from "#app.ts";
import { Commit, commitService } from "#commit.ts";
import { type Clients, Database, DataDirectory } from "#database.ts";
import type { TableShapeChanged } from "#errors.ts";
import { Live, liveService } from "#live.ts";
import { start } from "#startup.ts";

const writer = Effect.fn("journal.writer")(function* (filename: string) {
	const client = yield* SqliteClient.make({ filename });
	yield* Effect.orDie(client`PRAGMA synchronous = NORMAL`);
	return client;
});

const shared = Effect.map(writer(":memory:"), (client): Clients => ({ read: client, write: client }));

const onDisk = Effect.fn("journal.onDisk")(function* () {
	const directory = yield* DataDirectory;
	const filename = `${directory.path}/journal.db`;
	const write: SqlClient = yield* writer(filename);
	const read: SqlClient = yield* SqliteClient.make({ filename, readonly: true });
	return { read, write };
});

export const memory = (): Layer.Layer<Database | Reactivity> => Layer.provideMerge(Layer.effect(Database, shared), reactivityLayer);

export const file = (): Layer.Layer<Database | Reactivity, never, DataDirectory> =>
	Layer.provideMerge(Layer.effect(Database, onDisk()), reactivityLayer);

export const layer = (definition: AppDefinition): Layer.Layer<Commit | Live, TableShapeChanged, Database | Reactivity> =>
	Layer.effectContext(
		Effect.gen(function* () {
			const database = yield* Database;
			const reactivity = yield* Reactivity;
			const registry = registryOf(definition);
			yield* start(database.write, registry);
			return Context.make(Commit, commitService({ reactivity, registry, sql: database.write })).pipe(
				Context.add(Live, liveService({ reactivity, registry, sql: database.read })),
			);
		}),
	);
