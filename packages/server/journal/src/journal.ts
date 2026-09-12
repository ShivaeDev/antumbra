import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Clock, Context, Effect, FileSystem, Layer } from "effect";
import { Reactivity, layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { type AppDefinition, registryOf } from "#app.ts";
import { Commit, commitService } from "#commit.ts";
import { type Clients, Database, DataDirectory } from "#database.ts";
import { Live, liveService } from "#live.ts";
import { start } from "#startup.ts";

const writer = Effect.fn("journal.writer")(function* (filename: string) {
	const client = yield* SqliteClient.make({ filename });
	yield* Effect.orDie(client`PRAGMA synchronous = NORMAL`);
	return client;
});

const shared = Effect.map(writer(":memory:"), (client): Clients => ({ backup: Effect.void, read: client, write: client }));

const onDisk = Effect.fn("journal.onDisk")(function* () {
	const directory = yield* DataDirectory;
	const files = yield* FileSystem.FileSystem;
	const filename = `${directory.path}/journal.db`;
	const write: SqlClient = yield* writer(filename);
	const read: SqlClient = yield* SqliteClient.make({ filename, readonly: true });
	const backup = Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const backups = `${directory.path}/backups`;
		yield* files.makeDirectory(backups, { recursive: true });
		const target = `${backups}/journal-${now}-${crypto.randomUUID()}.db`;
		yield* write`VACUUM INTO ${target}`;
		yield* Effect.logInfo("journal backed up before projection rebuild", { path: target });
	}).pipe(Effect.orDie);
	return { backup, read, write };
});

export const memory = (): Layer.Layer<Database | Reactivity> => Layer.provideMerge(Layer.effect(Database, shared), reactivityLayer);

export const file = (): Layer.Layer<Database | Reactivity, never, DataDirectory | FileSystem.FileSystem> =>
	Layer.provideMerge(Layer.effect(Database, onDisk()), reactivityLayer);

export const layer = (definition: AppDefinition): Layer.Layer<Commit | Live, never, Database | Reactivity> =>
	Layer.effectContext(
		Effect.gen(function* () {
			const database = yield* Database;
			const reactivity = yield* Reactivity;
			const registry = yield* registryOf(definition);
			yield* start(database.write, registry, database.backup);
			return Context.make(Commit, commitService({ reactivity, registry, sql: database.write })).pipe(
				Context.add(Live, liveService({ reactivity, registry, sql: database.read })),
			);
		}),
	);
