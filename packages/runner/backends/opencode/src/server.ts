import type { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import { Deferred, Effect, PubSub, Queue, type Scope } from "effect";
import type { OpencodeConnection, OpencodeRequest } from "#connection.ts";
import type { ToolSessions } from "#tool-sessions.ts";

export interface OpencodeServer {
	readonly exited: Effect.Effect<void>;
	readonly frames: PubSub.PubSub<unknown>;
	readonly get: (request: OpencodeRequest) => Effect.Effect<unknown, BackendFailure>;
	readonly post: (request: OpencodeRequest) => Effect.Effect<unknown, BackendFailure>;
	readonly tools: ToolSessions;
}

export const makeOpencodeServer = Effect.fn("OpenCode.makeServer")(function* (
	connect: Effect.Effect<OpencodeConnection, BackendFailure, Scope.Scope>,
	tools: ToolSessions,
): Effect.fn.Return<OpencodeServer, BackendFailure, Scope.Scope> {
	const frames = yield* PubSub.unbounded<unknown>();
	const malformed = yield* Queue.unbounded<string>();
	yield* Effect.forkScoped(
		Queue.take(malformed).pipe(
			Effect.flatMap((line) => Effect.logWarning("opencode: dropped malformed event data", { line })),
			Effect.forever,
		),
	);
	const connection = yield* Effect.acquireRelease(connect, (open) => Effect.sync(() => open.close()));
	const exited = yield* Deferred.make<void>();
	connection.onExit(() => {
		Deferred.doneUnsafe(exited, Effect.void);
	});
	connection.onEvent({
		onFrame: (frame) => {
			PubSub.publishUnsafe(frames, frame);
		},
		onMalformed: (line) => {
			Queue.offerUnsafe(malformed, line);
		},
	});
	const call = (run: (request: OpencodeRequest) => Promise<unknown>) => (request: OpencodeRequest) => Effect.promise(() => run(request));
	return {
		exited: Deferred.await(exited),
		frames,
		get: call(connection.get),
		post: call(connection.post),
		tools,
	} satisfies OpencodeServer;
});
