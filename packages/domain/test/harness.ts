import { dirname, join } from "node:path";
import { IntentDemandLive } from "@antumbra/intent-demand";
import { KernelLive, type KernelOptions } from "@antumbra/kernel";
import {
	type TemporaryPersistence,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import {
	type AgentBackend,
	type ChangeHost,
	type DirectTool,
	type MooragePlan,
	noSessionAudit,
	type OpenSessionOptions,
	type ProvisionRequest,
	type Runner,
	type SessionHandle,
	type SessionInput,
} from "@antumbra/plugin-api";
import type { ResourceReconcileOptions } from "@antumbra/resource-reclamation";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer, Option, Queue, Ref, Stream } from "effect";
import type { ObserveCadenceOptions } from "#change-cadence.ts";
import { ChangeWatcherLive } from "#change-watcher.ts";
import { DispatcherLive, type DispatcherOptions } from "#dispatcher.ts";
import { AgentDomain, AgentDomainLive } from "#domain.ts";
import { IntentFeedLive } from "#intent-feed.ts";
import { KernelReachLive } from "#kernel-reach.ts";
import { SessionShutdownLive } from "#session-shutdown-live.ts";
import { SettingsSourceLive } from "#settings.ts";

export interface ScriptedRunner {
	readonly provisioned: Effect.Effect<ReadonlyArray<MooragePlan>>;
	readonly runner: Runner;
}

export const makeScriptedRunner = Effect.gen(function* () {
	const plans = yield* Ref.make<ReadonlyArray<MooragePlan>>([]);
	const plan = (request: ProvisionRequest): MooragePlan => ({
		berths: request.repos.map((repo, index) => ({
			branch: `work/${request.agentId.slice(0, 8)}/berth-${index}`,
			path: `/tmp/moorage/${request.agentId}/berth-${index}`,
			ref: repo.ref,
			slug: `berth-${index}`,
			source: repo.source,
		})),
		root: `/tmp/moorage/${request.agentId}`,
	});
	const runner: Runner = {
		captureChange: (berth) =>
			Effect.succeed({
				branch: berth.branch,
				headSha: `sha-${berth.branch}`,
				workingDiff: "",
				workingTreeStatus: "",
				worktreePath: berth.path,
			}),
		capabilities: { liveTerminal: false },
		plan,
		provision: (provisionPlan) =>
			Ref.update(plans, (all) => [...all, provisionPlan]),
		reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
		scrap: () => Effect.void,
		tag: "local",
	};
	return { provisioned: Ref.get(plans), runner } satisfies ScriptedRunner;
});

export const acquireTemporaryPersistence = Effect.acquireRelease(
	Effect.sync(temporaryPersistence),
	(temporary) => Effect.sync(temporary.remove),
);

export interface ScriptedSession {
	readonly closed: Effect.Effect<boolean>;
	readonly emit: (event: AgentEvent) => Effect.Effect<void>;
	readonly interrupted: Effect.Effect<boolean>;
	readonly received: Effect.Effect<ReadonlyArray<SessionInput>>;
	readonly sent: Effect.Effect<ReadonlyArray<string>>;
	readonly steered: Effect.Effect<ReadonlyArray<string>>;
	// why: the scripted backend is where a test reaches the tools a session was
	// opened with — a real harness hands them to a model instead.
	readonly tools: ReadonlyArray<DirectTool>;
}

export const rawOf = (kind: string): AgentEvent["raw"] => ({
	kind,
	payload: "{}",
	source: "scripted",
});

export interface ScriptedBackend {
	readonly backend: AgentBackend;
	readonly opened: Effect.Effect<ReadonlyArray<OpenSessionOptions>>;
	readonly session: (
		sessionId: string,
	) => Effect.Effect<ScriptedSession | undefined>;
}

const inputText = (input: SessionInput): string =>
	input.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n");

const recordInput = (
	received: Ref.Ref<ReadonlyArray<SessionInput>>,
	texts: Ref.Ref<ReadonlyArray<string>>,
	input: SessionInput,
) =>
	Ref.update(received, (all) => [...all, input]).pipe(
		Effect.andThen(Ref.update(texts, (all) => [...all, inputText(input)])),
	);

export const makeScriptedBackend = Effect.gen(function* () {
	const sessions = yield* Ref.make<ReadonlyMap<string, ScriptedSession>>(
		new Map(),
	);
	const opened = yield* Ref.make<ReadonlyArray<OpenSessionOptions>>([]);
	const backend: AgentBackend = {
		audit: noSessionAudit,
		capabilities: {
			fork: false,
			imageInput: true,
			liveInterrupt: true,
			multiClient: false,
		},
		openSession: (options) =>
			Effect.gen(function* () {
				yield* Ref.update(opened, (all) => [...all, options]);
				const events = yield* Queue.unbounded<AgentEvent>();
				const received = yield* Ref.make<ReadonlyArray<SessionInput>>([]);
				const sent = yield* Ref.make<ReadonlyArray<string>>([]);
				const steered = yield* Ref.make<ReadonlyArray<string>>([]);
				const closed = yield* Ref.make(false);
				const interrupted = yield* Ref.make(false);
				yield* Effect.addFinalizer(() => Ref.set(closed, true));
				const scripted: ScriptedSession = {
					closed: Ref.get(closed),
					emit: (event) => Queue.offer(events, event),
					interrupted: Ref.get(interrupted),
					received: Ref.get(received),
					sent: Ref.get(sent),
					steered: Ref.get(steered),
					tools: options.tools,
				};
				yield* Ref.update(sessions, (map) =>
					new Map(map).set(options.sessionId, scripted),
				);
				const handle: SessionHandle = {
					events: Stream.fromQueue(events),
					interrupt: Ref.set(interrupted, true),
					nativeRef: Effect.succeed(Option.some(`native-${options.sessionId}`)),
					queue: (input) => recordInput(received, sent, input),
					steer: (input) => recordInput(received, steered, input),
				};
				return handle;
			}),
		tag: "scripted",
	};
	return {
		backend,
		opened: Ref.get(opened),
		session: (sessionId) =>
			Ref.get(sessions).pipe(Effect.map((map) => map.get(sessionId))),
	} satisfies ScriptedBackend;
});

export { callTool, sessionFor, standDown } from "#test/session-reach.ts";

export const passiveRunner: Runner = {
	captureChange: (berth) =>
		Effect.succeed({
			branch: berth.branch,
			headSha: `sha-${berth.branch}`,
			workingDiff: "",
			workingTreeStatus: "",
			worktreePath: berth.path,
		}),
	capabilities: { liveTerminal: false },
	plan: (request) => ({
		berths: [],
		root: `/tmp/moorage/${request.agentId}`,
	}),
	provision: () => Effect.void,
	reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
	scrap: () => Effect.void,
	tag: "local",
};

export const changeHostsOf = (
	...hosts: ReadonlyArray<ChangeHost>
): ReadonlyMap<string, ChangeHost> =>
	new Map(hosts.map((host) => [host.tag, host] as const));

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
				join(dirname(temporary.database), "artifacts"),
				join(dirname(temporary.database), "session-inputs"),
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
