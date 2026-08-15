import { KernelLive, type KernelOptions } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import {
	type TemporaryPersistence,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import type {
	AgentBackend,
	DirectTool,
	ProvisionRequest,
	Runner,
	SessionHandle,
} from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/session-events";
import { Effect, Layer, Option, Queue, Ref, Stream } from "effect";
import { DispatcherLive, type DispatcherOptions } from "#dispatcher.ts";
import { AgentDomain, AgentDomainLive } from "#domain.ts";
import { KernelReachLive } from "#kernel-reach.ts";

export interface ScriptedRunner {
	readonly provisioned: Effect.Effect<ReadonlyArray<ProvisionRequest>>;
	readonly runner: Runner;
}

export const makeScriptedRunner = Effect.gen(function* () {
	const requests = yield* Ref.make<ReadonlyArray<ProvisionRequest>>([]);
	const runner: Runner = {
		capabilities: { liveTerminal: false },
		provision: (request) =>
			Ref.update(requests, (all) => [...all, request]).pipe(
				Effect.as({
					berths: request.repos.map((repo, index) => ({
						branch: `work/${request.agentId.slice(0, 8)}/berth-${index}`,
						path: `/tmp/moorage/${request.agentId}/berth-${index}`,
						ref: repo.ref,
						slug: `berth-${index}`,
						source: repo.source,
					})),
					root: `/tmp/moorage/${request.agentId}`,
				}),
			),
		reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
		scrap: () => Effect.void,
		tag: "local",
	};
	return { provisioned: Ref.get(requests), runner } satisfies ScriptedRunner;
});

export const acquireTemporaryPersistence = Effect.acquireRelease(
	Effect.sync(temporaryPersistence),
	(temporary) => Effect.sync(temporary.remove),
);

export interface ScriptedSession {
	readonly closed: Effect.Effect<boolean>;
	readonly emit: (event: AgentEvent) => Effect.Effect<void>;
	readonly interrupted: Effect.Effect<boolean>;
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
	readonly session: (
		sessionId: string,
	) => Effect.Effect<ScriptedSession | undefined>;
}

export const makeScriptedBackend = Effect.gen(function* () {
	const sessions = yield* Ref.make<ReadonlyMap<string, ScriptedSession>>(
		new Map(),
	);
	const backend: AgentBackend = {
		capabilities: {
			fork: false,
			liveInterrupt: true,
			multiClient: false,
		},
		openSession: (options) =>
			Effect.gen(function* () {
				const events = yield* Queue.unbounded<AgentEvent>();
				const sent = yield* Ref.make<ReadonlyArray<string>>([]);
				const steered = yield* Ref.make<ReadonlyArray<string>>([]);
				const closed = yield* Ref.make(false);
				const interrupted = yield* Ref.make(false);
				yield* Effect.addFinalizer(() => Ref.set(closed, true));
				const scripted: ScriptedSession = {
					closed: Ref.get(closed),
					emit: (event) => Queue.offer(events, event),
					interrupted: Ref.get(interrupted),
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
					queue: (text) => Ref.update(sent, (texts) => [...texts, text]),
					steer: (text) => Ref.update(steered, (texts) => [...texts, text]),
				};
				return handle;
			}),
		tag: "scripted",
	};
	return {
		backend,
		session: (sessionId) =>
			Ref.get(sessions).pipe(Effect.map((map) => map.get(sessionId))),
	} satisfies ScriptedBackend;
});

// why: a test reaches an agent the way the app does — through the session row
// the spawn wrote — so nothing has to be threaded out of the intent.
export const sessionFor = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.AgentSession.where({ agentId }).all())[0];
		if (row === undefined) {
			return yield* Effect.fail("no session yet");
		}
		const live = yield* scripted.session(row.id);
		return live === undefined
			? yield* Effect.fail("the session is not scripted")
			: live;
	});

export const callTool = (
	session: ScriptedSession,
	name: string,
	args: unknown,
) =>
	Option.match(
		Option.fromUndefinedOr(session.tools.find((tool) => tool.name === name)),
		{
			onNone: () => Effect.die(`the session has no ${name} tool`),
			onSome: (tool) => tool.call(args),
		},
	);

const passiveRunner: Runner = {
	capabilities: { liveTerminal: false },
	provision: (request) =>
		Effect.succeed({ berths: [], root: `/tmp/moorage/${request.agentId}` }),
	reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
	scrap: () => Effect.void,
	tag: "local",
};

export const domainKernelLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	options: Omit<KernelOptions, "kinds" | "gauges"> = {},
	runner: Runner = passiveRunner,
) =>
	KernelReachLive.pipe(
		Layer.provideMerge(
			Layer.unwrap(
				Effect.gen(function* () {
					const domain = yield* AgentDomain;
					return KernelLive({
						...options,
						gauges: domain.gauges,
						kinds: domain.kinds,
					});
				}),
			),
		),
		Layer.provideMerge(
			AgentDomainLive(
				new Map([[backend.tag, backend]]),
				new Map([[runner.tag, runner]]),
			),
		),
		Layer.provideMerge(temporary.layer),
	);

export const dispatchingLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	dispatcher: Partial<DispatcherOptions>,
	options: Omit<KernelOptions, "kinds" | "gauges"> = {},
	runner: Runner = passiveRunner,
) =>
	DispatcherLive(dispatcher).pipe(
		Layer.provideMerge(domainKernelLayer(temporary, backend, options, runner)),
	);
