import { makeAppRouter } from "@antumbra/contract";
import { drainActiveSessions } from "@antumbra/domain";
import { ensureInstallMarker } from "@antumbra/persistence";
import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.ts";
import { ownerBoot, runBoot, runManagedRuntimeStartup } from "#adapters/boot.ts";
import { drainManagedRuntime } from "#adapters/graceful-shutdown.ts";
import { registerOpenExternal } from "#adapters/open-external.ts";
import { applicationLayers } from "#adapters/runtime.ts";
import {
	claimDesktopOwnership,
	configureDataDirectory,
	desktopApplication,
	drainBeforeQuit,
	focusOrOpenConsole,
	quitWhenAllWindowsClosed,
	whenReady,
	windowLayoutInDataDirectory,
} from "#adapters/shell.ts";
import { devTracing } from "#adapters/tracing.ts";
import { fleetTray } from "#adapters/tray.ts";
import { registerTrpcBridge } from "#adapters/trpc-bridge.ts";
import { registerTrpcSubscriptions } from "#adapters/trpc-subscriptions.ts";
import { fileLayoutStore, type LayoutStore } from "#adapters/windows/layout-store.ts";
import { layoutWriter } from "#adapters/windows/layout-writer.ts";
import { openConsole, rendererDocument } from "#adapters/windows/open.ts";
import { makeWindowRegistry, type WindowShell } from "#adapters/windows/registry.ts";
import { restoreWindows } from "#adapters/windows/restore.ts";
import { WindowSourceLive } from "#adapters/windows/source.ts";

const LAYOUT_PATIENCE_MILLIS = 400;

const layoutStore = Effect.provide(
	Effect.map(FileSystem.FileSystem, (fs) => fileLayoutStore(fs, windowLayoutInDataDirectory(configureDataDirectory()))),
	NodeServices.layer,
);

const startOwner = (shell: WindowShell, store: LayoutStore) => {
	const runtime = ManagedRuntime.make(Layer.mergeAll(AppInfoSourceLive, WindowSourceLive(shell), devTracing(), Layer.orDie(applicationLayers())));
	const router = makeAppRouter(runtime);
	const main = Effect.gen(function* () {
		yield* drainBeforeQuit(drainManagedRuntime(runtime, drainActiveSessions));
		yield* whenReady;
		yield* Effect.sync(() => {
			registerTrpcBridge(router, shell.registry);
			registerTrpcSubscriptions(router, shell.registry);
			registerOpenExternal();
		});
		yield* quitWhenAllWindowsClosed;
		yield* ensureInstallMarker;
		const writer = yield* layoutWriter({
			patience: LAYOUT_PATIENCE_MILLIS,
			registry: shell.registry,
			store,
		});
		yield* restoreWindows(shell, store);
		yield* Effect.sync(() => {
			shell.registry.onChanged(() => runtime.runFork(writer.note));
			runtime.runFork(writer.run);
		});
		yield* Effect.sync(() => runtime.runFork(fleetTray(focusOrOpenConsole(shell.registry, openConsole(shell)))));
		yield* Effect.logInfo("bridge: console open");
	});
	return Effect.promise(() => runManagedRuntimeStartup(runtime, main));
};

const boot = Effect.gen(function* () {
	const document = yield* Effect.orDie(rendererDocument);
	const shell = { document, registry: makeWindowRegistry() };
	const store = yield* layoutStore;
	const ownership = claimDesktopOwnership(desktopApplication, shell.registry, openConsole(shell));
	return yield* ownerBoot(ownership, () => startOwner(shell, store));
});

runBoot(() => Effect.runPromise(boot));
