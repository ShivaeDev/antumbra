import { makeAppRouter } from "@antumbra/contract";
import {
	databaseFileInDataDirectory,
	ensureInstallMarker,
	PersistenceLive,
} from "@antumbra/persistence";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.js";
import {
	configureDataDirectory,
	openMainWindow,
	persistenceMigrationsDirectory,
	quitWhenAllWindowsClosed,
	whenReady,
} from "#adapters/shell.js";
import { registerTrpcBridge } from "#adapters/trpc-bridge.js";

const persistence = Layer.unwrap(
	Effect.sync(() =>
		PersistenceLive({
			database: databaseFileInDataDirectory(configureDataDirectory()),
			migrationsDirectory: persistenceMigrationsDirectory(),
		}),
	),
);

// why: a migration or connect failure leaves no meaningful app to run, so
// the persistence layer dies instead of threading an error type every
// consumer would have to carry.
const runtime = ManagedRuntime.make(
	Layer.mergeAll(AppInfoSourceLive, Layer.orDie(persistence)),
);
const router = makeAppRouter(runtime);

const main = Effect.gen(function* () {
	yield* whenReady;
	yield* Effect.sync(() => {
		registerTrpcBridge(router);
	});
	yield* quitWhenAllWindowsClosed;
	yield* ensureInstallMarker;
	yield* openMainWindow;
});

runtime.runFork(main);
