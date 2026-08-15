import { KernelLive, type KernelOptions } from "@antumbra/kernel";
import {
	type TemporaryPersistence,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import type {
	AgentBackend,
	SessionHandle,
	WireEvent,
} from "@antumbra/plugin-api";
import { Effect, Layer, Queue, Ref, Stream } from "effect";
import { AgentDomain, AgentDomainLive } from "#domain.ts";

export const acquireTemporaryPersistence = Effect.acquireRelease(
	Effect.sync(temporaryPersistence),
	(temporary) => Effect.sync(temporary.remove),
);

export interface ScriptedSession {
	readonly closed: Effect.Effect<boolean>;
	readonly emit: (event: WireEvent) => Effect.Effect<void>;
	readonly interrupted: Effect.Effect<boolean>;
	readonly sent: Effect.Effect<ReadonlyArray<string>>;
}

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
			steer: false,
		},
		openSession: (options) =>
			Effect.gen(function* () {
				const events = yield* Queue.unbounded<WireEvent>();
				const sent = yield* Ref.make<ReadonlyArray<string>>([]);
				const closed = yield* Ref.make(false);
				const interrupted = yield* Ref.make(false);
				yield* Effect.addFinalizer(() => Ref.set(closed, true));
				const scripted: ScriptedSession = {
					closed: Ref.get(closed),
					emit: (event) => Queue.offer(events, event),
					interrupted: Ref.get(interrupted),
					sent: Ref.get(sent),
				};
				yield* Ref.update(sessions, (map) =>
					new Map(map).set(options.sessionId, scripted),
				);
				const handle: SessionHandle = {
					events: Stream.fromQueue(events),
					interrupt: Ref.set(interrupted, true),
					send: (text) => Ref.update(sent, (texts) => [...texts, text]),
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

export const domainKernelLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	options: Omit<KernelOptions, "kinds" | "gauges"> = {},
) =>
	Layer.unwrap(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			return KernelLive({
				...options,
				gauges: domain.gauges,
				kinds: domain.kinds,
			});
		}),
	).pipe(
		Layer.provideMerge(AgentDomainLive(new Map([[backend.tag, backend]]))),
		Layer.provideMerge(temporary.layer),
	);
