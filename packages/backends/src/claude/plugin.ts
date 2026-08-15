import {
	type AgentBackend,
	type AntumbraPlugin,
	BackendFailure,
	type SessionHandle,
	type WireEvent,
} from "@antumbra/plugin-api";
import { Effect, Queue, Stream } from "effect";
import { openRawSession, type RawSession } from "#claude/adapters/session.ts";

const failure = (detail: unknown) =>
	new BackendFailure({ detail: String(detail), tag: "claude" });

const eventStream = (raw: RawSession): Stream.Stream<WireEvent> =>
	Stream.callback<WireEvent>((queue) =>
		Effect.sync(() => {
			raw.subscribe({
				end: () => Queue.endUnsafe(queue),
				event: (event) => Queue.offerUnsafe(queue, event),
			});
		}),
	);

const makeHandle = (raw: RawSession): SessionHandle => ({
	events: eventStream(raw),
	interrupt: Effect.tryPromise({ catch: failure, try: () => raw.interrupt() }),
	send: (text) => Effect.try({ catch: failure, try: () => raw.send(text) }),
});

export const claudeBackend: AgentBackend = {
	capabilities: {
		fork: true,
		liveInterrupt: true,
		multiClient: false,
		steer: false,
	},
	openSession: (options) =>
		Effect.acquireRelease(
			Effect.try({ catch: failure, try: () => openRawSession(options) }),
			(session) => Effect.sync(() => session.close()),
		).pipe(Effect.map(makeHandle)),
	tag: "claude",
};

export const claudePlugin: AntumbraPlugin = {
	activate: (context) => context.registerAgentBackend(claudeBackend),
	name: "claude",
};
