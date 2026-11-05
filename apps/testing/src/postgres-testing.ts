import { binaries, instance } from "@antumbra/server-storage/instance.ts";
import { migrations } from "@antumbra/server-storage/migrations.ts";
import { makePostgresTestLayer } from "@shivaedev/test-sql/server/postgres.ts";
import { Effect, FileSystem, Layer, Redacted } from "effect";

export const postgresTests = Layer.unwrap(
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const root = yield* fs.makeTempDirectoryScoped();
		const postgres = yield* instance(root);
		return makePostgresTestLayer({ url: Redacted.make(postgres.connectionUrl), migrations, maxConnections: 3 });
	}),
).pipe(Layer.provide(binaries));
