import { claudePlugin } from "@antumbra/backend-claude";
import { codexPlugin } from "@antumbra/backend-codex";
import {
	AgentDomain,
	AgentDomainLive,
	BackendCapacityReleaseLive,
	ChangeWatcherLive,
	DispatcherLive,
	FlagshipLive,
	IntentFeedLive,
	KernelReachLive,
	RulingAscentLive,
	RulingDeliveryLive,
	RulingSourceLive,
	SessionShutdownLive,
	SettingsSourceLive,
	SightSourceLive,
	VoyageSourceLive,
} from "@antumbra/domain";
import { githubPlugin } from "@antumbra/github";
import { IntentDemandLive } from "@antumbra/intent-demand";
import { KernelLive } from "@antumbra/kernel";
import {
	databaseFileInDataDirectory,
	PersistenceLive,
} from "@antumbra/persistence";
import { makePluginHost } from "@antumbra/plugin-api";
import { localRunnerPlugin } from "@antumbra/runner-local";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { findOnLoginPath } from "#adapters/login-shell.ts";
import {
	artifactsInDataDirectory,
	configureDataDirectory,
	persistenceMigrationsDirectory,
	runnerRootsInDataDirectory,
	sessionInputsInDataDirectory,
} from "#adapters/shell.ts";

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
		const host = yield* makePluginHost({ findExecutable: findOnLoginPath });
		const runnerPlugin = localRunnerPlugin(
			runnerRootsInDataDirectory(configureDataDirectory()),
		);
		yield* Effect.orDie(claudePlugin().activate(host.context));
		// why: the codex child runs from the data directory; threads get their
		// own cwd per session.
		yield* Effect.orDie(
			codexPlugin({ cwd: configureDataDirectory() }).activate(host.context),
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
			sessionInputsInDataDirectory(configureDataDirectory()),
		).pipe(Layer.provide(NodeServices.layer));
	}),
);

const kernel = Layer.unwrap(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return KernelLive({ kinds: domain.kinds });
	}),
).pipe(Layer.provideMerge(agents));

// why: the dispatcher, provider-capacity release, and change watcher stand
// beside the view source rather than under it — their work continues whether
// or not a window is watching.
export const applicationLayers = () =>
	Layer.mergeAll(
		RulingSourceLive,
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
		FlagshipLive,
		IntentFeedLive,
		KernelReachLive,
		RulingAscentLive,
		RulingDeliveryLive,
		SessionShutdownLive,
	).pipe(
		Layer.provideMerge(BackendCapacityReleaseLive),
		Layer.provideMerge(kernel),
		Layer.provideMerge(SettingsSourceLive),
		Layer.provideMerge(persistence),
	);
