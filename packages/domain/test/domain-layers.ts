import { dirname, join } from "node:path";
import type { ObserveCadenceOptions } from "@antumbra/changes/watch/cadence";
import { ChangeWatcher } from "@antumbra/changes/watch/observer";
import { intentDemandLayer } from "@antumbra/intent-demand";
import { KernelLive, type KernelOptions } from "@antumbra/kernel";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import type { ResourceReconcileOptions } from "@antumbra/resource-reclamation";
import { RulingDelivery } from "@antumbra/rulings/delivery/service";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { SettingsSourceLive } from "@antumbra/settings";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import { DispatcherLive, type DispatcherOptions } from "#dispatcher.ts";
import { AgentDomain, AgentDomainLive } from "#domain.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { IntentFeedLive } from "#intent-feed.ts";
import { KernelReachInstaller, KernelReachLive, type KernelReachService } from "#kernel-reach.ts";
import { RulingAscent } from "#ruling-ascent/observer.ts";
import { RulingDeliveryLive } from "#ruling-delivery.ts";
import { SessionShutdown } from "#shutdown/service.ts";
import { SightSourceLive } from "#sight.ts";
import { passiveRunner } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";

const artifactsDirectory = (temporary: TemporaryPersistence) => join(dirname(temporary.database), "artifacts");

const sessionInputsDirectory = (temporary: TemporaryPersistence) => join(dirname(temporary.database), "session-inputs");

const kernelReachLive = (reach: KernelReachService) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const installer = yield* KernelReachInstaller;
			yield* installer.install(reach);
		}),
	);

export const domainCapabilityLayer = (temporary: TemporaryPersistence, reach: KernelReachService = fakeKernelReach) =>
	kernelReachLive(reach).pipe(
		Layer.provideMerge(
			domainCapabilities(new Map(), new Map([[passiveRunner.tag, passiveRunner]]), artifactsDirectory(temporary)).pipe(
				Layer.provide(SessionFabricLive),
				Layer.provide(NodeServices.layer),
			),
		),
		Layer.provideMerge(SettingsSourceLive),
		Layer.provideMerge(temporary.layer),
	);

export const domainKernelServices = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	options: Omit<KernelOptions, "kinds"> = {},
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
				return intentDemandLayer(domain.intentDemands);
			}),
		),
		RulingAscent,
		RulingDeliveryLive,
		SessionShutdown.layer,
	).pipe(
		Layer.provideMerge(RulingDelivery.layer),
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
				sessionInputsDirectory(temporary),
				reclaim,
			).pipe(Layer.provide(NodeServices.layer)),
		),
		Layer.provideMerge(SettingsSourceLive),
	);

export const domainKernelLayer = (...args: Parameters<typeof domainKernelServices>) =>
	domainKernelServices(...args).pipe(Layer.provideMerge(args[0].layer));

export const dispatchingLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	dispatcher: Partial<DispatcherOptions>,
	options: Omit<KernelOptions, "kinds"> = {},
	runner: Runner = passiveRunner,
	changeHosts: ReadonlyMap<string, ChangeHost> = new Map(),
) => DispatcherLive(dispatcher).pipe(Layer.provideMerge(domainKernelLayer(temporary, backend, options, runner, changeHosts)));

export const sightSourceTestLayer = SightSourceLive.pipe(Layer.provideMerge(BackendCapacityReleases.layer));

export const watchingLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	cadence: Partial<ObserveCadenceOptions>,
	changeHosts: ReadonlyMap<string, ChangeHost>,
	dispatcher: Partial<DispatcherOptions> = {
		maxRunning: 4,
		patienceMillis: 50,
	},
	runner: Runner = passiveRunner,
) => ChangeWatcher(cadence).pipe(Layer.provideMerge(dispatchingLayer(temporary, backend, dispatcher, {}, runner, changeHosts)));
