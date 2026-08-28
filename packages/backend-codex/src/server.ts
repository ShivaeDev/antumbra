import type { BackendFailure } from "@antumbra/plugin-api";
import { Deferred, Effect, PubSub, Queue, type Scope } from "effect";
import type { LineProcess } from "#adapters/process.ts";
import {
	connectRpc,
	type RpcConnection,
	type RpcNotification,
	type RpcServerRequest,
} from "#adapters/rpc.ts";
import { codexFailure } from "#failure.ts";
import { handshake } from "#handshake.ts";
import { type Request, requestOn } from "#requests.ts";
import { answerServerRequest } from "#server-answers.ts";
import { openThreadClaims, type ThreadClaims } from "#thread-claims.ts";
import { makeToolRegistry, type ToolRegistry } from "#tool-registry.ts";

interface CodexServerOptions {
	readonly spawn: () => LineProcess;
}

export interface CodexServer {
	readonly exited: Effect.Effect<void>;
	readonly notifications: PubSub.PubSub<RpcNotification>;
	readonly request: Request;
	// why: the tree of one session's delegated threads is broadcast on the same
	// connection as every other session's, so which root owns which thread is
	// held here, beside the tools, rather than in any one session's head.
	readonly threads: ThreadClaims;
	// why: the child is shared by every session, so the tools a session was
	// opened with are held per thread here — a tool call arrives on the one
	// connection naming only its thread.
	readonly tools: ToolRegistry;
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
		const stderr = yield* Queue.unbounded<string>();
		const tools = yield* makeToolRegistry;
		const threads = openThreadClaims();
		const child = yield* Effect.acquireRelease(
			Effect.try({ catch: codexFailure, try: options.spawn }),
			(process) => Effect.sync(() => process.kill()),
		);
		const rpc = connectRpc(child);
		wire(rpc, notifications, serverRequests);
		// why: the child says why it is unhappy on stderr and nowhere else — a
		// malformed reply of ours leaves its only trace there.
		child.onStderr((text) => {
			Queue.offerUnsafe(stderr, text);
		});
		yield* Effect.forkScoped(
			Queue.take(stderr).pipe(
				Effect.flatMap((text) =>
					Effect.logWarning("codex app-server", { stderr: text }),
				),
				Effect.forever,
			),
		);
		const exited = yield* Deferred.make<void>();
		child.onExit(() => {
			Deferred.doneUnsafe(exited, Effect.void);
		});
		// why: an answer may wait — a tool call can be asking for a ruling — so
		// each request gets its own fiber. Answering them in turn would let one
		// waiting call hold up every other thread on the shared connection, and
		// app-server correlates replies by request id, so nothing depends on
		// them coming back in the order they were asked.
		yield* Effect.forkScoped(
			Queue.take(serverRequests).pipe(
				Effect.flatMap((request) =>
					Effect.forkScoped(answerServerRequest(rpc, tools, request)),
				),
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
			threads,
			tools,
		} satisfies CodexServer;
	});
