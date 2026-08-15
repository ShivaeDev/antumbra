import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	type AgentBackend,
	type AntumbraPlugin,
	BackendFailure,
	type OpenSessionOptions,
	type SessionHandle,
} from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/session-events";
import { type Context, Effect, Option, Queue, Ref, Stream } from "effect";
import { openRawSession, type RawSession } from "#adapters/session.ts";
import { toAgentEvents } from "#mapping.ts";

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

export interface ClaudePluginOptions {
	readonly executable: string;
}

// why: opening is scoped, so an abandoned handle can never leave the SDK
// subprocess running; the session's services travel with it because the tools
// it was opened with run their handlers on them.
const rawSession = (
	options: ClaudePluginOptions,
	session: OpenSessionOptions,
	services: Context.Context<never>,
) =>
	Effect.acquireRelease(
		Effect.try({
			catch: failure,
			try: () =>
				openRawSession({
					cwd: session.cwd,
					executable: options.executable,
					resume: Option.getOrUndefined(session.resume),
					services,
					tools: session.tools,
				}),
		}),
		(raw) => Effect.sync(() => raw.close()),
	);

export const claudeBackend = (options: ClaudePluginOptions): AgentBackend => ({
	capabilities: {
		fork: true,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: (session) =>
		Effect.context<never>().pipe(
			Effect.flatMap((services) => rawSession(options, session, services)),
			Effect.flatMap(makeHandle),
		),
	tag: "claude",
});

export const claudePlugin = (options: ClaudePluginOptions): AntumbraPlugin => ({
	activate: (context) => context.registerAgentBackend(claudeBackend(options)),
	name: "claude",
});
