import {
	type AgentBackend,
	type AntumbraPlugin,
	BackendFailure,
	type OpenSessionOptions,
	type SessionHandle,
	type SessionInput,
} from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Queue, Ref, Stream } from "effect";
import { openRawSession, type RawSession } from "#adapters/session.ts";
import { sessionToolCall } from "#adapters/session-tools.ts";
import { claudeAudit } from "#adapters/subagent-audit.ts";
import type { ToolCall } from "#adapters/tool-server.ts";
import { laneEvents, openSessionLanes } from "#session-lanes.ts";

const failure = (detail: unknown) =>
	new BackendFailure({ detail: String(detail), tag: "claude" });

const textOnly = (
	input: SessionInput,
): Effect.Effect<string, BackendFailure> => {
	const texts = input.parts.flatMap((part) =>
		part.type === "text" ? [part.text] : [],
	);
	return texts.length === input.parts.length
		? Effect.succeed(texts.join("\n"))
		: Effect.fail(
				failure("image input is not enabled for this installed Claude backend"),
			);
};

const rawEvents = (raw: RawSession): Stream.Stream<AgentEvent> =>
	Stream.callback<AgentEvent>((queue) =>
		Effect.sync(() => {
			const lanes = openSessionLanes();
			raw.subscribe({
				deliver: (delivery) => {
					for (const event of laneEvents(lanes, delivery)) {
						Queue.offerUnsafe(queue, event);
					}
				},
				end: () => Queue.endUnsafe(queue),
				recorded: lanes.recorded,
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
			queue: (input) => Effect.flatMap(textOnly(input), raw.queue),
			steer: (input) => Effect.flatMap(textOnly(input), raw.steer),
		}),
	);

export interface ClaudeBackendOptions {
	readonly executable: string;
}

// why: opening is scoped, so an abandoned handle can never leave the SDK
// subprocess running.
const rawSession = (
	options: ClaudeBackendOptions,
	session: OpenSessionOptions,
	call: ToolCall,
) =>
	Effect.acquireRelease(
		Effect.try({
			catch: failure,
			try: () =>
				openRawSession({
					call,
					cwd: session.cwd,
					executable: options.executable,
					resume: Option.getOrUndefined(session.resume),
					tools: session.tools,
				}),
		}),
		(raw) => Effect.sync(() => raw.close()),
	);

export const claudeBackend = (options: ClaudeBackendOptions): AgentBackend => ({
	audit: claudeAudit,
	capabilities: {
		fork: true,
		imageInput: false,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: (session) =>
		sessionToolCall.pipe(
			Effect.flatMap((call) => rawSession(options, session, call)),
			Effect.flatMap(makeHandle),
		),
	tag: "claude",
});

// why: Antumbra drives the CLI the user installed and bundles none — the
// backend is offered only when one is found, because a backend that cannot
// spawn is not a backend.
export const claudePlugin = (): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("claude"),
			Option.match({
				onNone: () =>
					Effect.logWarning(
						"claude: no executable found on the login PATH; backend not registered",
					),
				onSome: (executable) =>
					context.registerAgentBackend(claudeBackend({ executable })),
			}),
		),
	name: "claude",
});
