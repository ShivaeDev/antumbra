import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	type AgentBackend,
	type AgentEvent,
	type AntumbraPlugin,
	BackendFailure,
	type SessionHandle,
} from "@antumbra/plugin-api";
import { Effect, Option, Queue, Ref, Stream } from "effect";
import { openRawSession, type RawSession } from "#claude/adapters/session.ts";
import { toAgentEvents } from "#claude/mapping.ts";

const failure = (detail: unknown) =>
	new BackendFailure({ detail: String(detail), tag: "claude" });

const rawEvents = (raw: RawSession): Stream.Stream<AgentEvent> =>
	Stream.callback<AgentEvent>((queue) =>
		Effect.sync(() => {
			raw.subscribe({
				end: () => Queue.endUnsafe(queue),
				event: (message: SDKMessage) => {
					for (const event of toAgentEvents(message)) {
						Queue.offerUnsafe(queue, event);
					}
				},
			});
		}),
	);

const eventStream = (
	raw: RawSession,
	nativeRef: Ref.Ref<Option.Option<string>>,
): Stream.Stream<AgentEvent> =>
	rawEvents(raw).pipe(
		Stream.tap((event) =>
			event.type === "session.opened"
				? Ref.set(nativeRef, Option.some(event.nativeRef))
				: Effect.void,
		),
	);

const makeHandle = (raw: RawSession) =>
	Effect.map(
		Ref.make(Option.none<string>()),
		(nativeRef): SessionHandle => ({
			events: eventStream(raw, nativeRef),
			interrupt: Effect.tryPromise({
				catch: failure,
				try: () => raw.interrupt(),
			}),
			nativeRef: Ref.get(nativeRef),
			queue: (text) =>
				Effect.try({ catch: failure, try: () => raw.queue(text) }),
			steer: (text) =>
				Effect.try({ catch: failure, try: () => raw.steer(text) }),
		}),
	);

export const claudeBackend: AgentBackend = {
	capabilities: {
		fork: true,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: (options) =>
		Effect.acquireRelease(
			Effect.try({
				catch: failure,
				try: () =>
					openRawSession({
						cwd: options.cwd,
						resume: Option.getOrUndefined(options.resume),
					}),
			}),
			(session) => Effect.sync(() => session.close()),
		).pipe(Effect.flatMap(makeHandle)),
	tag: "claude",
};

export const claudePlugin: AntumbraPlugin = {
	activate: (context) => context.registerAgentBackend(claudeBackend),
	name: "claude",
};
