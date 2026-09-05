import type { BackendFailure, OpenSessionOptions, SessionHandle } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, PubSub, type Scope, Stream } from "effect";
import { openSessionProjection, type SessionProjection } from "#projection.ts";
import type { OpencodeServer } from "#server.ts";
import { frameFor } from "#session-frames.ts";
import { textOnly } from "#session-input.ts";
import { openSession, sessionIdOf, sessionOpened } from "#session-open.ts";
import { turnRequests } from "#turn-requests.ts";
import { makeTurnDriver } from "#turns.ts";

const eventsOfFrame =
	(sessionId: string, projection: SessionProjection) =>
	(frame: unknown): Stream.Stream<AgentEvent> =>
		Stream.fromIterable(
			Option.match(frameFor(sessionId, frame), {
				onNone: (): ReadonlyArray<AgentEvent> => [],
				onSome: projection.events,
			}),
		);

export const openOpencodeSession = Effect.fn("OpenCode.openSession")(function* (
	server: OpencodeServer,
	options: OpenSessionOptions,
): Effect.fn.Return<SessionHandle, BackendFailure, Scope.Scope> {
	const forEvents = yield* PubSub.subscribe(server.frames);
	const forDriver = yield* PubSub.subscribe(server.frames);
	const [route, response] = yield* openSession(server, options);
	const sessionId = yield* sessionIdOf(route, response);
	const driver = yield* makeTurnDriver(turnRequests(server, sessionId, options.cwd));
	yield* Effect.forkScoped(server.exited.pipe(Effect.andThen(driver.close)));
	yield* Effect.forkScoped(
		Stream.fromSubscription(forDriver).pipe(
			Stream.runForEach((frame) =>
				Option.match(frameFor(sessionId, frame), {
					onNone: () => Effect.void,
					onSome: driver.track,
				}),
			),
		),
	);
	const projection = openSessionProjection();
	const events: Stream.Stream<AgentEvent> = Stream.make(sessionOpened(route, response, sessionId)).pipe(
		Stream.concat(Stream.fromSubscription(forEvents).pipe(Stream.flatMap(eventsOfFrame(sessionId, projection)))),
		Stream.interruptWhen(server.exited),
	);
	return {
		events,
		interrupt: driver.interrupt,
		nativeRef: Effect.succeed(Option.some(sessionId)),
		queue: (input) => Effect.flatMap(textOnly(input), driver.queue),
		steer: (input) => Effect.flatMap(textOnly(input), driver.steer),
	} satisfies SessionHandle;
});
