import { makeAppRouter } from "@antumbra/contract";
import { drainActiveSessions, honorRestartIntent, SessionRestart } from "@antumbra/domain";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { ensureInstallMarker } from "@antumbra/persistence";
import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, ManagedRuntime, Ref } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.ts";
import { AppLifecycleSourceLive } from "#adapters/app-lifecycle.ts";
import { ownerBoot, runBoot, runManagedRuntimeStartup } from "#adapters/boot.ts";
import { drainManagedRuntime } from "#adapters/graceful-shutdown.ts";
import { registerOpenExternal } from "#adapters/open-external.ts";
import { RoleSettingsOverRpc } from "#adapters/role-settings.ts";
import { applicationLayers } from "#adapters/runtime.ts";
import { registerServerBridge } from "#adapters/server-bridge.ts";
import { ServerProcess, ServerProcessLive } from "#adapters/server-process.ts";
import {
	claimDesktopOwnership,
	configureDataDirectory,
	desktopApplication,
	drainBeforeQuit,
	focusOrOpenConsole,
	quitWhenAllWindowsClosed,
	serverBundle,
	serverDataDirectory,
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

const layoutStore = Effect.provide(
	Effect.map(FileSystem.FileSystem, (fs) => fileLayoutStore(fs, windowLayoutInDataDirectory(configureDataDirectory()))),
	NodeServices.layer,
);

const ownerLayers = (shell: WindowShell, restarting: Ref.Ref<boolean>) => {
	const serverProcess = Layer.provide(ServerProcessLive(serverBundle(), serverDataDirectory()), NodeServices.layer);
	const roleSettings = RoleSettingsOverRpc.pipe(Layer.provide(serverProcess), Layer.provide(DomainFeedsLive));
	return Layer.mergeAll(
		AppInfoSourceLive,
		WindowSourceLive(shell),
		devTracing(),
		serverProcess,
		AppLifecycleSourceLive(restarting).pipe(Layer.provideMerge(Layer.orDie(Layer.provide(applicationLayers(), roleSettings)))),
	);
};

const startOwner = (shell: WindowShell, store: LayoutStore) =>
	Effect.gen(function* () {
		const restarting = yield* Ref.make(false);
		const runtime = ManagedRuntime.make(ownerLayers(shell, restarting));
		const router = makeAppRouter(runtime);
		const main = Effect.gen(function* () {
			yield* drainBeforeQuit(
				drainManagedRuntime(runtime, drainActiveSessions),
				restarting,
				Effect.promise(() => runtime.runPromise(SessionRestart.use((restart) => restart.abandon()))),
			);
			yield* whenReady;
			yield* Effect.sync(() => {
				registerServerBridge(shell.registry, () => runtime.runPromise(ServerProcess.use(({ serving }) => serving)));
				registerTrpcBridge(router, shell.registry);
				registerTrpcSubscriptions(router, shell.registry);
				registerOpenExternal();
			});
			yield* quitWhenAllWindowsClosed;
			yield* ensureInstallMarker;
			yield* honorRestartIntent;
			const writer = yield* layoutWriter({
				registry: shell.registry,
				store,
			});
			yield* restoreWindows(shell, store);
			yield* Effect.sync(() => {
				shell.registry.onChanged(() => runtime.runFork(writer.note));
			});
			yield* Effect.sync(() => runtime.runFork(fleetTray(focusOrOpenConsole(shell.registry, openConsole(shell)))));
			yield* Effect.logInfo("bridge: console open");
		});
		return yield* Effect.promise(() => runManagedRuntimeStartup(runtime, main));
	});

const boot = Effect.gen(function* () {
	const document = yield* Effect.orDie(rendererDocument);
	const shell = { document, registry: makeWindowRegistry() };
	const store = yield* layoutStore;
	const ownership = claimDesktopOwnership(desktopApplication, shell.registry, openConsole(shell));
	return yield* ownerBoot(ownership, () => startOwner(shell, store));
});

runBoot(() => Effect.runPromise(boot));
