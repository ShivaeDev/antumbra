import { makePostgresTestLayer } from "@shivaedev/test-sql/server/postgres.ts";
import { Effect, FileSystem, Layer, Redacted } from "effect";
import { binaries, instance } from "#postgres/instance.ts";
import { migrations } from "#postgres/migrations.ts";

export const postgresTests = Layer.unwrap(
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const root = yield* fs.makeTempDirectoryScoped();
		const postgres = yield* instance(root);
		return makePostgresTestLayer({ url: Redacted.make(postgres.connectionUrl), migrations, maxConnections: 3 });
	}),
).pipe(Layer.provide(binaries));
