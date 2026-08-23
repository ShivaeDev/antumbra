import { dirname, join } from "node:path";
import { IntentDemandLive } from "@antumbra/intent-demand";
import { KernelLive, type KernelOptions } from "@antumbra/kernel";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import type { ResourceReconcileOptions } from "@antumbra/resource-reclamation";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import type { ObserveCadenceOptions } from "#change-cadence.ts";
import { ChangeWatcherLive } from "#change-watcher.ts";
import { DispatcherLive, type DispatcherOptions } from "#dispatcher.ts";
import { AgentDomain, AgentDomainLive } from "#domain.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { IntentFeedLive } from "#intent-feed.ts";
import { KernelReachInstaller, KernelReachLive } from "#kernel-reach.ts";
import { SessionShutdownLive } from "#session-shutdown-live.ts";
import { SettingsSourceLive } from "#settings.ts";
import { passiveRunner } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";

const artifactsDirectory = (temporary: TemporaryPersistence) =>
	join(dirname(temporary.database), "artifacts");

const fakeKernelReachLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const installer = yield* KernelReachInstaller;
		yield* installer.install(fakeKernelReach);
	}),
);

export const domainCapabilityLayer = (temporary: TemporaryPersistence) =>
	fakeKernelReachLive.pipe(
		Layer.provideMerge(
			domainCapabilities(
				new Map(),
				new Map([[passiveRunner.tag, passiveRunner]]),
				artifactsDirectory(temporary),
			).pipe(
				Layer.provide(SessionFabricLive),
				Layer.provide(NodeServices.layer),
			),
		),
		Layer.provideMerge(temporary.layer),
	);

export const domainKernelLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	options: Omit<KernelOptions, "kinds" | "gauges"> = {},
	runner: Runner = passiveRunner,
	changeHosts: ReadonlyMap<string, ChangeHost> = new Map(),
	reclaim: Partial<ResourceReconcileOptions> = {},
) =>
	Layer.mergeAll(
		IntentFeedLive,
		KernelReachLive,
		Layer.unwrap(
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				return IntentDemandLive(domain.intentDemands);
			}),
		),
		SessionShutdownLive,
	).pipe(
		Layer.provideMerge(
			Layer.unwrap(
				Effect.gen(function* () {
					const domain = yield* AgentDomain;
					return KernelLive({
						...options,
						kinds: domain.kinds,
					});
				}),
			),
		),
		Layer.provideMerge(
			AgentDomainLive(
				new Map([[backend.tag, backend]]),
				new Map([[runner.tag, runner]]),
				changeHosts,
				artifactsDirectory(temporary),
				reclaim,
			).pipe(Layer.provide(NodeServices.layer)),
		),
		Layer.provideMerge(temporary.layer),
	);

export const dispatchingLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	dispatcher: Partial<DispatcherOptions>,
	options: Omit<KernelOptions, "kinds" | "gauges"> = {},
	runner: Runner = passiveRunner,
	changeHosts: ReadonlyMap<string, ChangeHost> = new Map(),
) =>
	DispatcherLive(dispatcher).pipe(
		Layer.provideMerge(SettingsSourceLive),
		Layer.provideMerge(
			domainKernelLayer(temporary, backend, options, runner, changeHosts),
		),
	);

// why: the watcher stands beside the dispatcher exactly as it does in the app,
// so a test of "the host said it landed" runs the same path a real merge does
// — nothing in these tests ever calls a refresh by hand.
export const watchingLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	cadence: Partial<ObserveCadenceOptions>,
	changeHosts: ReadonlyMap<string, ChangeHost>,
	dispatcher: Partial<DispatcherOptions> = { maxAlive: 4, patienceMillis: 50 },
	runner: Runner = passiveRunner,
) =>
	ChangeWatcherLive(cadence).pipe(
		Layer.provideMerge(
			dispatchingLayer(temporary, backend, dispatcher, {}, runner, changeHosts),
		),
	);
