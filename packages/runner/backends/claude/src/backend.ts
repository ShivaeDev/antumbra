import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { type AgentBackend, BackendFailure, type OpenSessionOptions, type SessionHandle, type SessionInput } from "@antumbra/runner-ports/backend.ts";
import { makeBackendCapacityController } from "@antumbra/runner-ports/backend-capacity.ts";
import { Cause, Effect, Option, Queue, Ref, Stream } from "effect";
import { sessionToolCall } from "#adapters/session-tools.ts";
import { classifyClaudeCapacity } from "#capacity.ts";
import { effortLevel } from "#effort.ts";
import { ClaudeRuntime, type RawSession } from "#runtime.ts";
import { laneEvents, openSessionLanes } from "#session-lanes.ts";

const failure = (detail: unknown) => new BackendFailure({ detail: String(detail), tag: "claude" });

const textOnly = (input: SessionInput): Effect.Effect<string, BackendFailure> => {
	const texts = input.parts.flatMap((part) => (part.type === "text" ? [part.text] : []));
	return texts.length === input.parts.length
		? Effect.succeed(texts.join("\n"))
		: Effect.fail(failure("image input is not enabled for this installed Claude backend"));
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
				fail: (error) => Queue.failCauseUnsafe(queue, Cause.die(error)),
				recorded: lanes.recorded,
			});
		}),
	);

const eventStream = (raw: RawSession, nativeRef: Ref.Ref<Option.Option<string>>): Stream.Stream<AgentEvent> =>
	rawEvents(raw).pipe(Stream.tap((event) => (event.type === "session.opened" ? Ref.set(nativeRef, Option.some(event.nativeRef)) : Effect.void)));

const makeHandle = (raw: RawSession, resume: Option.Option<string>) =>
	Effect.map(
		Ref.make(resume),
		(nativeRef): SessionHandle => ({
			events: eventStream(raw, nativeRef),
			interrupt: Effect.promise(() => raw.interrupt()),
			nativeRef: Ref.get(nativeRef),
			queue: (input) => Effect.flatMap(textOnly(input), raw.queue),
			steer: (input) => Effect.flatMap(textOnly(input), raw.steer),
		}),
	);

export const makeClaudeBackend = Effect.gen(function* () {
	const runtime = yield* ClaudeRuntime;
	const capacity = yield* makeBackendCapacityController(classifyClaudeCapacity);
	return {
		audit: runtime.audit,
		capacity: capacity.source,
		capabilities: { imageInput: false },
		listModels: runtime.listModels,
		openSession: (session: OpenSessionOptions) =>
			Effect.gen(function* () {
				const call = yield* sessionToolCall;
				const effort = yield* effortLevel(session.effort);
				const raw = yield* runtime.open({ session, effort, call, observeCapacity: capacity.observe });
				return yield* makeHandle(raw, session.resume);
			}),
		tag: "claude",
	} satisfies AgentBackend;
});
