import type {
	BackendFailure,
	OpenSessionOptions,
	SessionHandle,
} from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, PubSub, Schema, type Scope, Stream } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { ThreadScoped } from "#protocol.ts";
import type { CodexServer } from "#server.ts";
import { openThread, threadIdOf, threadOpened } from "#thread-open.ts";
import { openThreadTree } from "#thread-tree.ts";
import { makeTurnDriver } from "#turns.ts";

const decodeScoped = Schema.decodeUnknownOption(ThreadScoped);

// why: the driver speaks for this session's own thread and no other — a turn
// belonging to a node is the node's business, and this session may only read it.
const forThread =
	(threadId: string) =>
	(notification: RpcNotification): boolean =>
		Option.match(decodeScoped(notification.params), {
			onNone: () => false,
			onSome: (scoped) => scoped.threadId === threadId,
		});

// why: both subscriptions are taken before the thread exists, so nothing
// the server says about it can slip past; the tree then selects this session's
// slice of the shared stream — its own thread and the descendants it admitted.
// Item and turn events are one projection, the turn driver another — the log
// never depends on the driver having consumed anything.
export const openThreadSession = (
	server: CodexServer,
	options: OpenSessionOptions,
): Effect.Effect<SessionHandle, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const forEvents = yield* PubSub.subscribe(server.notifications);
		const forDriver = yield* PubSub.subscribe(server.notifications);
		const [method, response] = yield* openThread(server, options);
		const threadId = yield* threadIdOf(method, response);
		yield* server.tools.register(threadId, options.tools);
		yield* Effect.addFinalizer(() =>
			Effect.sync(() => server.threads.release(threadId)).pipe(
				Effect.andThen(server.tools.forget(threadId)),
			),
		);
		const tree = openThreadTree(threadId, server.threads);
		const driver = yield* makeTurnDriver(server, threadId);
		yield* Effect.forkScoped(
			Stream.fromSubscription(forDriver).pipe(
				Stream.filter(forThread(threadId)),
				Stream.runForEach(driver.track),
			),
		);
		const events: Stream.Stream<AgentEvent> = Stream.make(
			threadOpened(method, response, threadId),
		).pipe(
			Stream.concat(
				Stream.fromSubscription(forEvents).pipe(
					Stream.flatMap((notification) =>
						Stream.fromIterable(tree.events(notification)),
					),
				),
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
