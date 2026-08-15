import type {
	BackendFailure,
	OpenSessionOptions,
	SessionHandle,
} from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/session-events";
import { Effect, Option, PubSub, Schema, type Scope, Stream } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { codexFailure } from "#failure.ts";
import { rawOf, toAgentEvents } from "#mapping.ts";
import { ThreadResponse, ThreadScoped } from "#protocol.ts";
import type { CodexServer } from "#server.ts";
import { makeTurnDriver } from "#turns.ts";

// why: the ruled v0 policy — writes confined to the moorage by codex's own
// sandbox, escapes judged by codex's literal auto mode (an LLM reviewer),
// never `approvalPolicy: never` and never a sandbox bypass.
const THREAD_POLICY = {
	approvalsReviewer: "auto_review",
	sandbox: "workspace-write",
};

const decodeScoped = Schema.decodeUnknownOption(ThreadScoped);
const decodeThread = Schema.decodeUnknownOption(ThreadResponse);

const forThread =
	(threadId: string) =>
	(notification: RpcNotification): boolean =>
		Option.match(decodeScoped(notification.params), {
			onNone: () => false,
			onSome: (scoped) => scoped.threadId === threadId,
		});

const openThread = (server: CodexServer, options: OpenSessionOptions) =>
	Option.match(options.resume, {
		onNone: () =>
			server
				.request("thread/start", { cwd: options.cwd, ...THREAD_POLICY })
				.pipe(Effect.map((response) => ["thread/start", response] as const)),
		onSome: (threadId) =>
			server
				.request("thread/resume", {
					cwd: options.cwd,
					threadId,
					...THREAD_POLICY,
				})
				.pipe(Effect.map((response) => ["thread/resume", response] as const)),
	});

const threadIdOf = (method: string, response: unknown) =>
	Option.match(decodeThread(response), {
		onNone: () => Effect.fail(codexFailure(`${method} returned no thread`)),
		onSome: ({ thread }) => Effect.succeed(thread.id),
	});

const opened = (
	method: string,
	response: unknown,
	threadId: string,
): AgentEvent => ({
	nativeRef: threadId,
	raw: rawOf(method, response),
	type: "session.opened",
});

// why: both subscriptions are taken before the thread exists, so nothing
// the server says about it can slip past; the thread id then selects the
// session's slice of the shared stream. Item and turn events are one
// projection, the turn driver another — the log never depends on the
// driver having consumed anything.
export const openThreadSession = (
	server: CodexServer,
	options: OpenSessionOptions,
): Effect.Effect<SessionHandle, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const forEvents = yield* PubSub.subscribe(server.notifications);
		const forDriver = yield* PubSub.subscribe(server.notifications);
		const [method, response] = yield* openThread(server, options);
		const threadId = yield* threadIdOf(method, response);
		const own = forThread(threadId);
		const driver = yield* makeTurnDriver(server, threadId);
		yield* Effect.forkScoped(
			Stream.fromSubscription(forDriver).pipe(
				Stream.filter(own),
				Stream.runForEach(driver.track),
			),
		);
		const events: Stream.Stream<AgentEvent> = Stream.make(
			opened(method, response, threadId),
		).pipe(
			Stream.concat(
				Stream.fromSubscription(forEvents).pipe(
					Stream.filter(own),
					Stream.flatMap((notification) =>
						Stream.fromIterable(toAgentEvents(notification)),
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
