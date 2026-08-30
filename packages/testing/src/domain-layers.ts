import { dirname, join } from "node:path";
import {
	AgentDomain,
	AgentDomainLive,
	ChangeWatcherLive,
	DispatcherLive,
	type DispatcherOptions,
	IntentFeedLive,
	KernelReachLive,
	type ObserveCadenceOptions,
	type ResourceReconcileOptions,
	RulingAscentLive,
	RulingDeliveryLive,
	SessionShutdownLive,
	SettingsSourceLive,
} from "@antumbra/domain";
import { IntentDemandLive } from "@antumbra/intent-demand";
import { KernelLive, type KernelOptions } from "@antumbra/kernel";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { passiveRunner } from "#scripted-runner.ts";

const artifactsDirectory = (temporary: TemporaryPersistence) =>
	join(dirname(temporary.database), "artifacts");

const sessionInputsDirectory = (temporary: TemporaryPersistence) =>
	join(dirname(temporary.database), "session-inputs");

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
		RulingAscentLive,
		RulingDeliveryLive,
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
				sessionInputsDirectory(temporary),
				reclaim,
			).pipe(Layer.provide(NodeServices.layer)),
		),
		// why: the domain's own clock-driven passes read the catalog, so the
		// settings stand under it here exactly as they do in the app.
		Layer.provideMerge(SettingsSourceLive),
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
		Layer.provideMerge(
			domainKernelLayer(temporary, backend, options, runner, changeHosts),
		),
	);

// why: the watcher stands beside the dispatcher exactly as it does in the app,
// so a test of "the host said it landed" runs the same path a real merge does.
// Nothing in these tests ever calls a refresh by hand.
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
