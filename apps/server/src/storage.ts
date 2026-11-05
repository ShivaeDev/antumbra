import { binaries, instance } from "@antumbra/server-storage/instance.ts";
import { migrations } from "@antumbra/server-storage/migrations.ts";
import { LiveServer } from "@shivaedev/contract/LiveServer.ts";
import { migrateAppPostgres } from "@shivaedev/local-postgres/server/migrateAppPostgres.ts";
import { migratePostgres } from "@shivaedev/sql/migrations.ts";
import { postgresLayer } from "@shivaedev/sql/postgresLayer.ts";
import { Effect, Layer, Redacted } from "effect";
import { compatiblePostgres } from "#postgres-version.ts";

export const prepareDatabase = Effect.fn("Storage.prepareDatabase")((directory: string) =>
	Effect.gen(function* () {
		const postgres = yield* instance(directory);
		yield* Effect.scoped(
			compatiblePostgres.pipe(
				Effect.andThen(migrateAppPostgres(postgres, migratePostgres(migrations))),
				Effect.provide(postgresLayer(Redacted.make(postgres.connectionUrl))),
			),
		);
		return Redacted.make(postgres.connectionUrl);
	}).pipe(Effect.provide(binaries)),
);

export const storage = (url: Redacted.Redacted<string>) => LiveServer.layer.pipe(Layer.provideMerge(postgresLayer(url)));

export const ownedStorage = (directory: string) => Layer.unwrap(Effect.map(prepareDatabase(directory), storage));
