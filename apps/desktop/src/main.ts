import { claudePlugin } from "@antumbra/backend-claude";
import { codexPlugin } from "@antumbra/backend-codex";
import { makeAppRouter } from "@antumbra/contract";
import {
	AgentDomain,
	AgentDomainLive,
	ChangeWatcherLive,
	DispatcherLive,
	drainActiveSessions,
	KernelReachLive,
	SessionShutdownLive,
	SightSourceLive,
	VoyageSourceLive,
} from "@antumbra/domain";
import { githubPlugin } from "@antumbra/github";
import { IntentDemandLive } from "@antumbra/intent-demand";
import { KernelLive } from "@antumbra/kernel";
import {
	databaseFileInDataDirectory,
	ensureInstallMarker,
	PersistenceLive,
} from "@antumbra/persistence";
import { makePluginHost } from "@antumbra/plugin-api";
import { localRunnerPlugin } from "@antumbra/runner-local";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "#adapters/app-info.ts";
import { ArtifactPresentationSourceLive } from "#adapters/artifact-presentation.ts";
import { ownerBoot, runBoot } from "#adapters/boot.ts";
import { drainManagedRuntime } from "#adapters/graceful-shutdown.ts";
import { activateInstalledCli } from "#adapters/installed-cli.ts";
import { mainDocumentAuthority } from "#adapters/main-document-authority.ts";
import { openMainWindow } from "#adapters/main-window.ts";
import {
	acquireDesktopOwnership,
	artifactsInDataDirectory,
	configureDataDirectory,
	drainBeforeQuit,
	persistenceMigrationsDirectory,
	quitWhenAllWindowsClosed,
	runnerRootsInDataDirectory,
	whenReady,
} from "#adapters/shell.ts";
import { registerTrpcBridge } from "#adapters/trpc-bridge.ts";
import { registerTrpcSubscriptions } from "#adapters/trpc-subscriptions.ts";

const startOwner = () => {
	const persistence = Layer.unwrap(
		Effect.sync(() =>
			PersistenceLive({
				artifactsRoot: artifactsInDataDirectory(configureDataDirectory()),
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
			// why: registered unconditionally, unlike the agent CLIs — a change host
			// that cannot reach gh still claims its repos and says why through its
			// capability, where a missing backend would leave a voyage unable to run
			// at all. A login gained later is picked up without a restart.
			yield* Effect.orDie(githubPlugin().activate(host.context));
			return AgentDomainLive(
				yield* host.backends,
				yield* host.runners,
				yield* host.changeHosts,
				artifactsInDataDirectory(configureDataDirectory()),
			).pipe(Layer.provide(NodeServices.layer));
		}),
	);
	const kernel = Layer.unwrap(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			return KernelLive({ kinds: domain.kinds });
		}),
	).pipe(Layer.provideMerge(agents));
	// why: the dispatcher and the change watcher stand beside the view source
	// rather than under it — launched pieces are spawned for and open changes are
	// followed whether or not a window is watching.
	const bridge = Layer.mergeAll(
		ArtifactPresentationSourceLive,
		SightSourceLive,
		VoyageSourceLive,
		ChangeWatcherLive(),
		DispatcherLive(),
		Layer.unwrap(
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				return IntentDemandLive(domain.intentDemands);
			}),
		),
		KernelReachLive,
		SessionShutdownLive,
	).pipe(Layer.provideMerge(kernel), Layer.provideMerge(persistence));
	// why: a migration or connect failure leaves no meaningful app to run, so
	// the persistence layer dies instead of threading an error type every
	// consumer would have to carry.
	const runtime = ManagedRuntime.make(
		Layer.mergeAll(AppInfoSourceLive, Layer.orDie(bridge)),
	);
	const router = makeAppRouter(runtime);
	const main = Effect.gen(function* () {
		yield* drainBeforeQuit(drainManagedRuntime(runtime, drainActiveSessions));
		yield* whenReady;
		yield* Effect.sync(() => {
			registerTrpcBridge(router, mainDocumentAuthority);
			registerTrpcSubscriptions(router, mainDocumentAuthority);
		});
		yield* quitWhenAllWindowsClosed;
		yield* ensureInstallMarker;
		yield* openMainWindow(mainDocumentAuthority);
		yield* Effect.logInfo("bridge: window open");
	});
	return Effect.promise(() => runtime.runPromise(main));
};

runBoot(() =>
	Effect.runPromise(ownerBoot(acquireDesktopOwnership, startOwner)),
);
