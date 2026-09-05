import { claudePlugin } from "@antumbra/backend-claude";
import { codexPlugin } from "@antumbra/backend-codex";
import { opencodePlugin } from "@antumbra/backend-opencode";
import {
	AgentDomain,
	AgentDomainLive,
	BackendCapacityReleaseLive,
	ChangeWatcher,
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
import { databaseFileInDataDirectory, PersistenceLive } from "@antumbra/persistence";
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
			database: databaseFileInDataDirectory(configureDataDirectory()),
			migrationsDirectory: persistenceMigrationsDirectory(),
		}),
	),
);

const agents = Layer.unwrap(
	Effect.gen(function* () {
		const host = yield* makePluginHost({ findExecutable: findOnLoginPath });
		const runnerPlugin = localRunnerPlugin(runnerRootsInDataDirectory(configureDataDirectory()));
		yield* Effect.orDie(claudePlugin().activate(host.context));
		yield* Effect.orDie(codexPlugin({ cwd: configureDataDirectory() }).activate(host.context));
		yield* Effect.orDie(opencodePlugin({ cwd: configureDataDirectory() }).activate(host.context));
		yield* Effect.orDie(runnerPlugin.activate(host.context));
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

export const applicationLayers = () =>
	Layer.mergeAll(
		RulingSourceLive,
		SightSourceLive,
		VoyageSourceLive,
		ChangeWatcher(),
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
