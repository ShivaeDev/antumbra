import type { BackendFailure } from "@antumbra/plugin-api";
import { Deferred, Effect, PubSub, Queue, type Scope } from "effect";
import type { LineProcess } from "#adapters/process.ts";
import {
	connectRpc,
	type RpcConnection,
	type RpcNotification,
	type RpcServerRequest,
} from "#adapters/rpc.ts";
import { answerServerRequest } from "#approvals.ts";
import { codexFailure } from "#failure.ts";
import { handshake } from "#handshake.ts";
import { type Request, requestOn } from "#requests.ts";

export interface CodexServerOptions {
	readonly spawn: () => LineProcess;
}

export interface CodexServer {
	readonly exited: Effect.Effect<void>;
	readonly notifications: PubSub.PubSub<RpcNotification>;
	readonly request: Request;
}

const wire = (
	rpc: RpcConnection,
	notifications: PubSub.PubSub<RpcNotification>,
	serverRequests: Queue.Queue<RpcServerRequest>,
): void => {
	rpc.onNotification((notification) => {
		PubSub.publishUnsafe(notifications, notification);
	});
	// why: a server request is also published as a notification, so the
	// session log records that an approval was asked (and, via
	// serverRequest/resolved, how it went) — the answer itself is decided in
	// approvals.ts.
	rpc.onServerRequest((request) => {
		PubSub.publishUnsafe(notifications, {
			method: request.method,
			params: request.params,
		});
		Queue.offerUnsafe(serverRequests, request);
	});
};

// why: one long-lived app-server child per host, hosting a thread per
// session — the topology codex itself documents and its own clients use. It
// lives as long as the scope that made it; a dead child ends every
// session's stream through `exited`.
export const makeCodexServer = (
	options: CodexServerOptions,
): Effect.Effect<CodexServer, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const notifications = yield* PubSub.unbounded<RpcNotification>();
		const serverRequests = yield* Queue.unbounded<RpcServerRequest>();
		const child = yield* Effect.acquireRelease(
			Effect.try({ catch: codexFailure, try: options.spawn }),
			(process) => Effect.sync(() => process.kill()),
		);
		const rpc = connectRpc(child);
		wire(rpc, notifications, serverRequests);
		const exited = yield* Deferred.make<void>();
		child.onExit(() => {
			Deferred.doneUnsafe(exited, Effect.void);
		});
		yield* Effect.forkScoped(
			Queue.take(serverRequests).pipe(
				Effect.flatMap((request) => answerServerRequest(rpc, request)),
				Effect.forever,
				Effect.ignore,
			),
		);
		const request = requestOn(rpc);
		yield* handshake(request);
		rpc.notify("initialized", {});
		return {
			exited: Deferred.await(exited),
			notifications,
			request,
		} satisfies CodexServer;
	});
