import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, ManagedRuntime, Ref } from "effect";
import { app } from "electron";
import { lifecycle, ShellLifecycle, ShellLifecycleLayer } from "#adapters/app-lifecycle.ts";
import { ownerBoot, runBoot, runManagedRuntimeStartup } from "#adapters/boot.ts";
import { ShellDraftsLayer } from "#adapters/drafts.ts";
import { drainManagedRuntime, requestRestart } from "#adapters/graceful-shutdown.ts";
import { registerOpenExternal } from "#adapters/open-external.ts";
import { RunnerProcessLayer } from "#adapters/runner-process.ts";
import { ServerProcess, ServerProcessLive } from "#adapters/server-process.ts";
import {
	claimDesktopOwnership,
	configureDataDirectory,
	desktopApplication,
	drainBeforeQuit,
	focusOrOpenConsole,
	quitWhenAllWindowsClosed,
	runnerBundle,
	serverBundle,
	serverDataDirectory,
	whenReady,
	windowLayoutInDataDirectory,
} from "#adapters/shell.ts";
import { registerShellBridge } from "#adapters/shell-bridge.ts";
import { ShellStateLayer } from "#adapters/shell-state.ts";
import { devTracing } from "#adapters/tracing.ts";
import { fleetTray } from "#adapters/tray.ts";
import { fileLayoutStore, type LayoutStore } from "#adapters/windows/layout-store.ts";
import { layoutWriter } from "#adapters/windows/layout-writer.ts";
import { openConsole, rendererDocument } from "#adapters/windows/open.ts";
import { makeWindowRegistry, type WindowShell } from "#adapters/windows/registry.ts";
import { restoreWindows } from "#adapters/windows/restore.ts";
import { WindowSourceLive } from "#adapters/windows/source.ts";
import { browserLink } from "#browser-link.ts";

const ownerLayers = (shell: WindowShell, directory: string) => {
	const state = ShellStateLayer(directory).pipe(Layer.provide(NodeServices.layer));
	const server = ServerProcessLive(serverBundle(), serverDataDirectory(), directory).pipe(Layer.provide(state), Layer.provide(NodeServices.layer));
	const runner = RunnerProcessLayer(runnerBundle(), directory).pipe(Layer.provide(server), Layer.provide(state), Layer.provide(NodeServices.layer));
	return Layer.mergeAll(
		WindowSourceLive(shell),
		ShellDraftsLayer(directory),
		devTracing(),
		server,
		runner,
		ShellLifecycleLayer.pipe(Layer.provide(server)),
	);
};

const announceBrowserLink = (document: string) =>
	Effect.gen(function* () {
		const serving = yield* ServerProcess.use((source) => source.serving);
		const link = browserLink(document, serving);
		if (link !== undefined) {
			yield* Effect.logInfo(`browser: ${link}`);
		}
	});

const startOwner = (shell: WindowShell, store: LayoutStore, directory: string) =>
	Effect.gen(function* () {
		const restarting = yield* Ref.make(false);
		const runtime = ManagedRuntime.make(ownerLayers(shell, directory));
		const restart = requestRestart(restarting, lifecycle("recordRestart").pipe(Effect.orDie), () => app.quit());
		const main = Effect.gen(function* () {
			yield* drainBeforeQuit(
				drainManagedRuntime(runtime, lifecycle("drain")),
				restarting,
				Effect.promise(() => runtime.runPromise(lifecycle("abandonRestart"))),
			);
			yield* whenReady;
			yield* registerShellBridge(shell.registry, () => runtime.runPromise(restart));
			yield* announceBrowserLink(shell.document);
			yield* Effect.sync(registerOpenExternal);
			yield* quitWhenAllWindowsClosed;
			yield* lifecycle("honorRestart");
			const writer = yield* layoutWriter({ registry: shell.registry, store });
			yield* restoreWindows(shell, store);
			yield* Effect.sync(() => shell.registry.onChanged(() => runtime.runFork(writer.note)));
			const api = yield* ShellLifecycle;
			yield* Effect.sync(() =>
				runtime.runFork(
					fleetTray(
						api["agents.workingCount"]({}),
						focusOrOpenConsole(shell.registry, openConsole(shell)),
						restart.pipe(Effect.provideService(ShellLifecycle, api)),
					),
				),
			);
			yield* Effect.logInfo("shell: console open");
		});
		return yield* Effect.promise(() => runManagedRuntimeStartup(runtime, main));
	});

const boot = Effect.gen(function* () {
	const directory = configureDataDirectory();
	const document = yield* Effect.orDie(rendererDocument);
	const shell = { document, registry: makeWindowRegistry() };
	const store = yield* Effect.map(FileSystem.FileSystem, (fs) => fileLayoutStore(fs, windowLayoutInDataDirectory(directory))).pipe(
		Effect.provide(NodeServices.layer),
	);
	const ownership = claimDesktopOwnership(desktopApplication, shell.registry, openConsole(shell));
	return yield* ownerBoot(ownership, () => startOwner(shell, store, directory));
});
runBoot(() => Effect.runPromise(boot));
