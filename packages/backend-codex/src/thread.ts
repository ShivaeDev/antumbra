import type { BackendFailure, OpenSessionOptions, SessionHandle } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, PubSub, Schema, type Scope, Stream } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { agentSettings } from "#agent-settings.ts";
import { toAgentEvents } from "#mapping.ts";
import { ThreadScoped } from "#protocol.ts";
import { RATE_LIMITS_METHOD } from "#rate-limits.ts";
import type { CodexServer } from "#server.ts";
import { openThread, threadIdOf, threadOpened } from "#thread-open.ts";
import { openThreadTree, type ThreadTree } from "#thread-tree.ts";
import { makeTurnDriver } from "#turns.ts";

const decodeScoped = Schema.decodeUnknownOption(ThreadScoped);

const forThread =
	(threadId: string) =>
	(notification: RpcNotification): boolean =>
		Option.match(decodeScoped(notification.params), {
			onNone: () => false,
			onSome: (scoped) => scoped.threadId === threadId,
		});

const sessionEvents = (tree: ThreadTree, notification: RpcNotification): ReadonlyArray<AgentEvent> =>
	notification.method === RATE_LIMITS_METHOD ? toAgentEvents(notification) : tree.events(notification);

export const openThreadSession = (server: CodexServer, options: OpenSessionOptions): Effect.Effect<SessionHandle, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const forEvents = yield* PubSub.subscribe(server.notifications);
		const forDriver = yield* PubSub.subscribe(server.notifications);
		const settings = yield* agentSettings(options);
		const [method, response] = yield* openThread(server, options, settings);
		const threadId = yield* threadIdOf(method, response);
		yield* server.tools.register(threadId, options.tools);
		yield* Effect.addFinalizer(() => Effect.sync(() => server.threads.release(threadId)).pipe(Effect.andThen(server.tools.forget(threadId))));
		const tree = openThreadTree(threadId, server.threads);
		const driver = yield* makeTurnDriver(server, threadId, settings);
		yield* Effect.forkScoped(Stream.fromSubscription(forDriver).pipe(Stream.filter(forThread(threadId)), Stream.runForEach(driver.track)));
		const events: Stream.Stream<AgentEvent> = Stream.make(threadOpened(method, response, threadId)).pipe(
			Stream.concat(
				Stream.fromSubscription(forEvents).pipe(Stream.flatMap((notification) => Stream.fromIterable(sessionEvents(tree, notification)))),
			),
			Stream.interruptWhen(server.exited),
		);
		return {
			events,
			interrupt: driver.interrupt,
			nativeRef: Effect.succeed(Option.some(threadId)),
			queue: driver.queue,
			steer: driver.steer,
		} satisfies SessionHandle;
	});
