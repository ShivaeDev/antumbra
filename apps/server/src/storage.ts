import { binaries, instance } from "@antumbra/server-storage/instance.ts";
import { migrations } from "@antumbra/server-storage/migrations.ts";
import { migrateAppPostgres } from "@shivaedev/local-postgres/server/migrateAppPostgres.ts";
import { migratePostgres } from "@shivaedev/sql/migrations.ts";
import { postgresLayer } from "@shivaedev/sql/postgresLayer.ts";
import { Effect, Layer, Redacted } from "effect";
import { compatiblePostgres } from "#postgres-version.ts";

export const storage = (directory: string) =>
	Layer.unwrap(
		Effect.gen(function* () {
			const postgres = yield* instance(directory);
			return Layer.effectDiscard(compatiblePostgres.pipe(Effect.andThen(migrateAppPostgres(postgres, migratePostgres(migrations))))).pipe(
				Layer.provideMerge(postgresLayer(Redacted.make(postgres.connectionUrl))),
			);
		}),
	).pipe(Layer.provide(binaries));
