import { hostPostgresBinaries } from "@shivaedev/local-postgres/server/adapters/hostPostgresBinaries.ts";
import { appPostgres } from "@shivaedev/local-postgres/server/appPostgres.ts";
import { Config, Effect, Layer, Path } from "effect";

export const binaries = Layer.unwrap(
	Config.String("ANTUMBRA_POSTGRES_BIN_DIRECTORY").pipe(
		Config.withDefault(""),
		Effect.map((directory) => hostPostgresBinaries(directory || undefined)),
	),
);

export const instance = Effect.fn("Postgres.instance")(function* (root: string) {
	const path = yield* Path.Path;
	return yield* appPostgres({ dataDirectory: path.join(root, "postgres"), backupsToKeep: 3 });
});
