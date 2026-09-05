import type { BackendCapacityController, BackendFailure } from "@antumbra/plugin-api";
import { Deferred, Duration, Effect, type Option, PubSub, Queue, RcRef, type Scope } from "effect";
import type { LineProcess } from "#adapters/process.ts";
import { connectRpc, type RpcConnection, type RpcNotification, type RpcServerRequest } from "#adapters/rpc.ts";
import { tellCliVersionOnce } from "#cli-version.ts";
import { codexFailure } from "#failure.ts";
import { handshake, offerSkills } from "#handshake.ts";
import { rawOf } from "#mapping.ts";
import { type Request, requestOn } from "#requests.ts";
import { answerServerRequest } from "#server-answers.ts";
import { openThreadClaims, type ThreadClaims } from "#thread-claims.ts";
import { makeToolRegistry, type ToolRegistry } from "#tool-registry.ts";

interface CodexServerOptions {
	readonly observeCapacity?: BackendCapacityController["observe"];
	readonly skills: string;
	readonly spawn: () => LineProcess;
}

export interface CodexServer {
	readonly exited: Effect.Effect<void>;
	readonly notifications: PubSub.PubSub<RpcNotification>;
	readonly request: Request;
	readonly threads: ThreadClaims;
	readonly tools: ToolRegistry;
	readonly version: Option.Option<string>;
}

const wire = (
	rpc: RpcConnection,
	notifications: PubSub.PubSub<RpcNotification>,
	serverRequests: Queue.Queue<RpcServerRequest>,
	observeCapacity: BackendCapacityController["observe"] | undefined,
): void => {
	rpc.onNotification((notification) => {
		observeCapacity?.(rawOf(notification.method, notification.params));
		PubSub.publishUnsafe(notifications, notification);
	});
	rpc.onServerRequest((request) => {
		observeCapacity?.(rawOf(request.method, request.params));
		PubSub.publishUnsafe(notifications, {
			method: request.method,
			params: request.params,
		});
		Queue.offerUnsafe(serverRequests, request);
	});
};

export const makeCodexServer = (options: CodexServerOptions): Effect.Effect<CodexServer, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const notifications = yield* PubSub.unbounded<RpcNotification>();
		const serverRequests = yield* Queue.unbounded<RpcServerRequest>();
		const stderr = yield* Queue.unbounded<string>();
		const tools = yield* makeToolRegistry;
		const threads = openThreadClaims();
		const child = yield* Effect.acquireRelease(Effect.try({ catch: codexFailure, try: options.spawn }), (process) =>
			Effect.sync(() => process.kill()),
		);
		const rpc = connectRpc(child);
		wire(rpc, notifications, serverRequests, options.observeCapacity);
		child.onStderr((text) => {
			Queue.offerUnsafe(stderr, text);
		});
		yield* Effect.forkScoped(
			Queue.take(stderr).pipe(
				Effect.flatMap((text) => Effect.logWarning("codex app-server", { stderr: text })),
				Effect.forever,
			),
		);
		const exited = yield* Deferred.make<void>();
		child.onExit(() => {
			Deferred.doneUnsafe(exited, Effect.void);
		});
		yield* Effect.forkScoped(
			Queue.take(serverRequests).pipe(
				Effect.flatMap((request) => Effect.forkScoped(answerServerRequest(rpc, tools, request))),
				Effect.forever,
				Effect.ignore,
			),
		);
		const request = requestOn(rpc);
		const version = yield* handshake(request);
		rpc.notify("initialized", {});
		yield* offerSkills(request, options.skills);
		return {
			exited: Deferred.await(exited),
			notifications,
			request,
			threads,
			tools,
			version,
		} satisfies CodexServer;
	});

type CodexServers = RcRef.RcRef<CodexServer, BackendFailure>;

const IDLE_APP_SERVER_LIFE = Duration.minutes(5);

const forgetWhenExited = (live: CodexServer, pool: Deferred.Deferred<CodexServers>) =>
	Effect.forkScoped(Effect.andThen(live.exited, Effect.flatMap(Deferred.await(pool), RcRef.invalidate)));

export const makeCodexServers = (options: CodexServerOptions): Effect.Effect<CodexServers, never, Scope.Scope> =>
	Effect.gen(function* () {
		const tell = yield* tellCliVersionOnce;
		const pool = yield* Deferred.make<CodexServers>();
		const servers = yield* RcRef.make({
			acquire: makeCodexServer(options).pipe(
				Effect.tap((live) => tell(live.version)),
				Effect.tap((live) => forgetWhenExited(live, pool)),
			),
			idleTimeToLive: IDLE_APP_SERVER_LIFE,
		});
		yield* Deferred.succeed(pool, servers);
		return servers;
	});
