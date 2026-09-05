import type { BackendFailure, OpenSessionOptions, SessionHandle, SessionInput } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, PubSub, type Scope, Stream } from "effect";
import { sessionToolCall } from "#adapters/tool-call.ts";
import { piTools } from "#adapters/tools.ts";
import { thinkingLevel } from "#effort.ts";
import { piFailure } from "#failure.ts";
import { rawOf, toAgentEvents } from "#mapping.ts";
import type { PiEvent, PiRuntime, PiSession } from "#runtime.ts";

const textOnly = (input: SessionInput): Effect.Effect<string, BackendFailure> => {
	const texts = input.parts.flatMap((part) => (part.type === "text" ? [part.text] : []));
	return texts.length === input.parts.length
		? Effect.succeed(texts.join("\n"))
		: Effect.fail(piFailure("image input is not enabled for the pi backend"));
};

const sessionOpened = (session: PiSession): AgentEvent => ({
	nativeRef: session.sessionFile,
	raw: rawOf("session/opened", { sessionFile: session.sessionFile, sessionId: session.sessionId }),
	type: "session.opened",
});

const deliver = (session: PiSession, delivery: "followUp" | "steer") => (text: string) =>
	Effect.tryPromise({ catch: piFailure, try: () => session.prompt(text, delivery) });

const liveSession = (runtime: PiRuntime, request: Parameters<PiRuntime["open"]>[0]) =>
	Effect.acquireRelease(Effect.tryPromise({ catch: piFailure, try: () => runtime.open(request) }), (session) =>
		Effect.promise(() => session.abort()).pipe(Effect.andThen(Effect.sync(() => session.dispose()))),
	);

export const openPiSession = (runtime: PiRuntime, options: OpenSessionOptions): Effect.Effect<SessionHandle, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const effort = yield* thinkingLevel(options.effort);
		const call = yield* sessionToolCall;
		const session = yield* liveSession(runtime, {
			constrainedPrompt: options.constrainedPrompt,
			cwd: options.cwd,
			effort,
			model: Option.getOrUndefined(options.model),
			resume: Option.getOrUndefined(options.resume),
			tools: piTools(options.tools, call),
		});
		const emitted = yield* PubSub.unbounded<PiEvent>();
		const forEvents = yield* PubSub.subscribe(emitted);
		const unsubscribe = session.subscribe((event) => {
			PubSub.publishUnsafe(emitted, event);
		});
		yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
		const served = new Set(options.tools.map((tool) => tool.name));
		const events: Stream.Stream<AgentEvent> = Stream.make(sessionOpened(session)).pipe(
			Stream.concat(Stream.fromSubscription(forEvents).pipe(Stream.flatMap((event) => Stream.fromIterable(toAgentEvents(event, served))))),
		);
		return {
			events,
			interrupt: Effect.tryPromise({ catch: piFailure, try: () => session.abort() }),
			nativeRef: Effect.succeed(Option.some(session.sessionFile)),
			queue: (input) => Effect.flatMap(textOnly(input), deliver(session, "followUp")),
			steer: (input) => Effect.flatMap(textOnly(input), deliver(session, "steer")),
		} satisfies SessionHandle;
	});
