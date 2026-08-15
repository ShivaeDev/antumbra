import {
	AgentDomain,
	AgentDomainLive,
	claudePlugin,
	SightSourceLive,
} from "@antumbra/backends";
import { makeAppRouter } from "@antumbra/contract";
import { KernelLive } from "@antumbra/kernel";
import {
	databaseFileInDataDirectory,
	ensureInstallMarker,
	PersistenceLive,
} from "@antumbra/persistence";
import { makePluginHost } from "@antumbra/plugin-api";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.ts";
import { runBoot } from "#adapters/boot.ts";
import {
	configureDataDirectory,
	openMainWindow,
	persistenceMigrationsDirectory,
	quitWhenAllWindowsClosed,
	whenReady,
} from "#adapters/shell.ts";
import { registerTrpcBridge } from "#adapters/trpc-bridge.ts";
import { registerTrpcSubscriptions } from "#adapters/trpc-subscriptions.ts";

const persistence = Layer.unwrap(
	Effect.sync(() =>
		PersistenceLive({
			database: databaseFileInDataDirectory(configureDataDirectory()),
			migrationsDirectory: persistenceMigrationsDirectory(),
		}),
	),
);

const agents = Layer.unwrap(
	Effect.gen(function* () {
		const host = yield* makePluginHost;
		yield* Effect.orDie(claudePlugin.activate(host.context));
		return AgentDomainLive(yield* host.backends);
	}),
);

const kernel = Layer.unwrap(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return KernelLive({ gauges: domain.gauges, kinds: domain.kinds });
	}),
).pipe(Layer.provideMerge(agents));

// why: a migration or connect failure leaves no meaningful app to run, so
// the persistence layer dies instead of threading an error type every
// consumer would have to carry.
const runtime = ManagedRuntime.make(
	Layer.mergeAll(
		AppInfoSourceLive,
		Layer.orDie(
			SightSourceLive.pipe(
				Layer.provideMerge(kernel),
				Layer.provideMerge(persistence),
			),
		),
	),
);
const router = makeAppRouter(runtime);

const main = Effect.gen(function* () {
	yield* whenReady;
	yield* Effect.sync(() => {
		registerTrpcBridge(router);
		registerTrpcSubscriptions(router);
	});
	yield* quitWhenAllWindowsClosed;
	yield* ensureInstallMarker;
	yield* openMainWindow;
	yield* Effect.logInfo("bridge: window open");
});

runBoot(() => runtime.runPromise(main));
