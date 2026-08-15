import {
	type AgentBackend,
	type AntumbraPlugin,
	BackendFailure,
	type SessionHandle,
	type WireEvent,
} from "@antumbra/plugin-api";
import { Effect, Queue, Stream } from "effect";
import { openRawSession } from "#adapters/claude-sdk.ts";

const failure = (detail: unknown) =>
	new BackendFailure({ detail: String(detail), tag: "claude" });

// why: capabilities narrowed from the app-server superset — the SDK gives
// interrupt and fork-by-transcript, but no steer and no multi-client (D8).
export const claudeBackend: AgentBackend = {
	capabilities: {
		fork: true,
		liveInterrupt: true,
		multiClient: false,
		steer: false,
	},
	openSession: (options) =>
		Effect.gen(function* () {
			const raw = yield* Effect.acquireRelease(
				Effect.try({ catch: failure, try: () => openRawSession(options) }),
				(session) => Effect.sync(() => session.close()),
			);
			return {
				events: Stream.callback<WireEvent>((queue) =>
					Effect.sync(() => {
						raw.subscribe({
							end: () => {
								Queue.endUnsafe(queue);
							},
							event: (event) => {
								Queue.offerUnsafe(queue, event);
							},
						});
					}),
				),
				interrupt: Effect.tryPromise({
					catch: failure,
					try: () => raw.interrupt(),
				}),
				send: (text) =>
					Effect.try({ catch: failure, try: () => raw.send(text) }),
			} satisfies SessionHandle;
		}),
	tag: "claude",
};

export const claudePlugin: AntumbraPlugin = {
	activate: (context) => context.registerAgentBackend(claudeBackend),
	name: "claude",
};
