import { type AgentBackend, noSessionAudit, type OpenSessionOptions, type SessionHandle, type SessionInput } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Queue, Ref, Stream } from "effect";

export interface ScriptedSession {
	readonly closed: Effect.Effect<boolean>;
	readonly emit: (event: AgentEvent) => Effect.Effect<void>;
	readonly interrupted: Effect.Effect<boolean>;
	readonly received: Effect.Effect<ReadonlyArray<SessionInput>>;
	readonly sent: Effect.Effect<ReadonlyArray<string>>;
	readonly steered: Effect.Effect<ReadonlyArray<string>>;
	readonly tools: OpenSessionOptions["tools"];
}

export interface ScriptedBackend {
	readonly backend: AgentBackend;
	readonly opened: Effect.Effect<ReadonlyArray<OpenSessionOptions>>;
	readonly queued: Effect.Effect<{ readonly sessionId: string; readonly input: SessionInput }>;
	readonly steered: Effect.Effect<{ readonly sessionId: string; readonly input: SessionInput }>;
	readonly session: (sessionId: string) => Effect.Effect<ScriptedSession | undefined>;
}

export const rawOf = (kind: string): AgentEvent["raw"] => ({
	kind,
	payload: "{}",
	source: "scripted",
});

const inputText = (input: SessionInput): string =>
	input.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n");

const recordInput = (received: Ref.Ref<ReadonlyArray<SessionInput>>, texts: Ref.Ref<ReadonlyArray<string>>, input: SessionInput) =>
	Ref.update(received, (all) => [...all, input]).pipe(Effect.andThen(Ref.update(texts, (all) => [...all, inputText(input)])));

export const makeScriptedBackend = Effect.gen(function* () {
	const sessions = yield* Ref.make<ReadonlyMap<string, ScriptedSession>>(new Map());
	const opened = yield* Ref.make<ReadonlyArray<OpenSessionOptions>>([]);
	const queued = yield* Queue.unbounded<{ readonly sessionId: string; readonly input: SessionInput }>();
	const steeredInputs = yield* Queue.unbounded<{ readonly sessionId: string; readonly input: SessionInput }>();
	const backend: AgentBackend = {
		audit: noSessionAudit,
		capabilities: {
			imageInput: true,
		},
		listModels: Effect.succeed([
			{ efforts: ["low", "high"], id: "haiku", isDefault: true, name: "Haiku" },
			{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
		]),
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
				yield* Ref.update(sessions, (map) => new Map(map).set(options.sessionId, scripted));
				const handle: SessionHandle = {
					events: Stream.fromQueue(events),
					interrupt: Ref.set(interrupted, true),
					nativeRef: Effect.succeed(Option.some(`native-${options.sessionId}`)),
					queue: (input) => recordInput(received, sent, input).pipe(Effect.andThen(Queue.offer(queued, { sessionId: options.sessionId, input }))),
					steer: (input) =>
						recordInput(received, steered, input).pipe(Effect.andThen(Queue.offer(steeredInputs, { sessionId: options.sessionId, input }))),
				};
				return handle;
			}),
		tag: "scripted",
	};
	return {
		backend,
		opened: Ref.get(opened),
		queued: Queue.take(queued),
		steered: Queue.take(steeredInputs),
		session: (sessionId) => Ref.get(sessions).pipe(Effect.map((map) => map.get(sessionId))),
	} satisfies ScriptedBackend;
});
