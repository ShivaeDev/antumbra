import { makeAppRouter } from "@antumbra/contract";
import { drainActiveSessions } from "@antumbra/domain";
import { ensureInstallMarker } from "@antumbra/persistence";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.ts";
import {
	ownerBoot,
	runBoot,
	runManagedRuntimeStartup,
} from "#adapters/boot.ts";
import { drainManagedRuntime } from "#adapters/graceful-shutdown.ts";
import { registerOpenExternal } from "#adapters/open-external.ts";
import { applicationLayers } from "#adapters/runtime.ts";
import {
	claimDesktopOwnership,
	desktopApplication,
	drainBeforeQuit,
	focusOrOpenConsole,
	quitWhenAllWindowsClosed,
	whenReady,
} from "#adapters/shell.ts";
import { fleetTray } from "#adapters/tray.ts";
import { registerTrpcBridge } from "#adapters/trpc-bridge.ts";
import { registerTrpcSubscriptions } from "#adapters/trpc-subscriptions.ts";
import { openConsole, rendererDocument } from "#adapters/windows/open.ts";
import {
	makeWindowRegistry,
	type WindowShell,
} from "#adapters/windows/registry.ts";
import { WindowSourceLive } from "#adapters/windows/source.ts";

const reveal = (shell: WindowShell) =>
	focusOrOpenConsole(shell.registry, openConsole(shell));

const startOwner = (shell: WindowShell) => {
	// why: a migration or connect failure leaves no meaningful app to run, so
	// the persistence layer dies instead of threading an error type every
	// consumer would have to carry.
	const runtime = ManagedRuntime.make(
		Layer.mergeAll(
			AppInfoSourceLive,
			WindowSourceLive(shell),
			Layer.orDie(applicationLayers()),
		),
	);
	const router = makeAppRouter(runtime);
	const main = Effect.gen(function* () {
		yield* drainBeforeQuit(drainManagedRuntime(runtime, drainActiveSessions));
		yield* whenReady;
		yield* Effect.sync(() => {
			registerTrpcBridge(router, shell.registry);
			registerTrpcSubscriptions(router, shell.registry);
			registerOpenExternal(shell.registry);
		});
		yield* quitWhenAllWindowsClosed;
		yield* ensureInstallMarker;
		yield* openConsole(shell);
		// why: the tray watches the fleet long after startup returns, so it runs
		// as its own root fiber on the runtime. Every fiber the runtime starts is
		// registered in the runtime's scope, so disposing it during the quit drain
		// interrupts the feed subscription and destroys the icon with it.
		yield* Effect.sync(() => runtime.runFork(fleetTray(reveal(shell))));
		yield* Effect.logInfo("bridge: console open");
	});
	return Effect.promise(() => runManagedRuntimeStartup(runtime, main));
};

const boot = Effect.gen(function* () {
	const document = yield* Effect.orDie(rendererDocument);
	const shell = { document, registry: makeWindowRegistry() };
	const ownership = claimDesktopOwnership(
		desktopApplication,
		shell.registry,
		openConsole(shell),
	);
	return yield* ownerBoot(ownership, () => startOwner(shell));
});

runBoot(() => Effect.runPromise(boot));
