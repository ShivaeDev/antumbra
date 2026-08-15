import { claudePlugin } from "@antumbra/backend-claude";
import { codexPlugin } from "@antumbra/backend-codex";
import { makeAppRouter } from "@antumbra/contract";
import {
	AgentDomain,
	AgentDomainLive,
	DispatcherLive,
	KernelReachLive,
	SightSourceLive,
} from "@antumbra/domain";
import { KernelLive } from "@antumbra/kernel";
import {
	databaseFileInDataDirectory,
	ensureInstallMarker,
	PersistenceLive,
} from "@antumbra/persistence";
import { makePluginHost } from "@antumbra/plugin-api";
import { localRunnerPlugin } from "@antumbra/runner-local";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.ts";
import { runBoot } from "#adapters/boot.ts";
import { activateInstalledCli } from "#adapters/installed-cli.ts";
import {
	configureDataDirectory,
	openMainWindow,
	persistenceMigrationsDirectory,
	quitWhenAllWindowsClosed,
	runnerRootsInDataDirectory,
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
		const runnerPlugin = localRunnerPlugin(
			runnerRootsInDataDirectory(configureDataDirectory()),
		);
		yield* activateInstalledCli(host.context, "claude", (executable) =>
			claudePlugin({ executable }),
		);
		// why: the codex child runs from the data directory; threads get their
		// own cwd per session.
		yield* activateInstalledCli(host.context, "codex", (command) =>
			codexPlugin({ command, cwd: configureDataDirectory() }),
		);
		yield* Effect.orDie(runnerPlugin.activate(host.context));
		return AgentDomainLive(yield* host.backends, yield* host.runners);
	}),
);

const kernel = Layer.unwrap(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return KernelLive({ gauges: domain.gauges, kinds: domain.kinds });
	}),
).pipe(Layer.provideMerge(agents));

// why: the dispatcher stands beside the view source rather than under it —
// launched pieces are spawned for whether or not a window is watching.
const bridge = Layer.mergeAll(
	SightSourceLive,
	DispatcherLive(),
	KernelReachLive,
).pipe(Layer.provideMerge(kernel), Layer.provideMerge(persistence));

// why: a migration or connect failure leaves no meaningful app to run, so
// the persistence layer dies instead of threading an error type every
// consumer would have to carry.
const runtime = ManagedRuntime.make(
	Layer.mergeAll(AppInfoSourceLive, Layer.orDie(bridge)),
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
