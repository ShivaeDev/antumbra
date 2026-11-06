import { ownedStorage } from "@antumbra/server/storage.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ConfigProvider, Effect, Exit, FileSystem, Layer, Path, Scope } from "effect";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { answered } from "#answers.ts";
import { apiOf } from "#api.ts";
import { definition, layer } from "#app.ts";

const create = Effect.fn("RuntimeStory.create")(function* () {
	const lifetime = yield* Effect.scope;
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const directory = yield* fs.makeTempDirectoryScoped();
	const boot = (binaries?: string) =>
		Effect.gen(function* () {
			const scope = yield* Scope.fork(lifetime);
			const database = ownedStorage(directory);
			const configured =
				binaries === undefined
					? database
					: database.pipe(Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ ANTUMBRA_POSTGRES_BIN_DIRECTORY: binaries }))));
			const services = yield* Layer.build(layer.pipe(Layer.provideMerge(configured))).pipe(Scope.provide(scope));
			const api = yield* apiOf(definition).pipe(Effect.provideContext(services), Scope.provide(scope));
			return { scope, api };
		});
	let server = yield* boot();
	const restart = (binaries?: string) =>
		Effect.gen(function* () {
			yield* Scope.close(server.scope, Exit.void);
			server = yield* boot(binaries);
		});
	return {
		openVoyage: (input: Parameters<typeof server.api.voyages.open>[0]) => server.api.voyages.open(input),
		voyages: () => answered(server.api.voyages.list({}), "the running server's Voyages"),
		restart: restart(),
		startWithoutBinaries: Effect.gen(function* () {
			return yield* restart(path.join(directory, "missing-binaries"));
		}),
		startWithMismatchedBinaries: Effect.gen(function* () {
			const bin = path.join(directory, "incompatible-binaries");
			yield* fs.makeDirectory(bin);
			for (const name of ["postgres", "initdb", "pg_dump"]) {
				const file = path.join(bin, name);
				yield* fs.writeFileString(file, "#!/bin/sh\nprintf 'PostgreSQL 1.0\\n'\n");
				yield* fs.chmod(file, 0o700);
			}
			return yield* restart(bin);
		}),
	};
});
export const runtimeApp = storyKit({
	name: "Antumbra running application",
	clock: "test",
	layer: NodeServices.layer,
	stages: [],
	create,
	verbs: (engine) => engine,
});
