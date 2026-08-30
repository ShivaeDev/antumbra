import type { BackendFailure } from "@antumbra/plugin-api";
import { Deferred, Effect, PubSub, type Scope } from "effect";
import type { OpencodeConnection, OpencodeRequest } from "#adapters/connection.ts";
import { opencodeFailure } from "#failure.ts";

export interface OpencodeServer {
	readonly exited: Effect.Effect<void>;
	readonly frames: PubSub.PubSub<unknown>;
	readonly get: (request: OpencodeRequest) => Effect.Effect<unknown, BackendFailure>;
	readonly post: (request: OpencodeRequest) => Effect.Effect<unknown, BackendFailure>;
}

export const makeOpencodeServer = (connect: () => Promise<OpencodeConnection>): Effect.Effect<OpencodeServer, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const frames = yield* PubSub.unbounded<unknown>();
		const connection = yield* Effect.acquireRelease(Effect.tryPromise({ catch: opencodeFailure, try: connect }), (open) =>
			Effect.sync(() => open.close()),
		);
		const exited = yield* Deferred.make<void>();
		connection.onExit(() => {
			Deferred.doneUnsafe(exited, Effect.void);
		});
		connection.onEvent((frame) => {
			PubSub.publishUnsafe(frames, frame);
		});
		const call = (run: (request: OpencodeRequest) => Promise<unknown>) => (request: OpencodeRequest) =>
			Effect.tryPromise({ catch: opencodeFailure, try: () => run(request) });
		return {
			exited: Deferred.await(exited),
			frames,
			get: call(connection.get),
			post: call(connection.post),
		} satisfies OpencodeServer;
	});
