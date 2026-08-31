import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Queue, type Scope } from "effect";
import type { LineProcess } from "#adapters/process.ts";
import { connectRpc, type RpcServerRequest } from "#adapters/rpc.ts";
import { codexFailure } from "#failure.ts";
import { handshake } from "#handshake.ts";
import { type Request, requestOn } from "#requests.ts";
import { answerServerRequest } from "#server-answers.ts";
import { makeToolRegistry } from "#tool-registry.ts";

export interface AuditConnection {
	readonly request: Request;
}

export const openAuditConnection = (spawn: () => LineProcess): Effect.Effect<AuditConnection, BackendFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const tools = yield* makeToolRegistry;
		const serverRequests = yield* Queue.unbounded<RpcServerRequest>();
		const child = yield* Effect.acquireRelease(Effect.try({ catch: codexFailure, try: spawn }), (process) => Effect.sync(() => process.kill()));
		const rpc = connectRpc(child);
		rpc.onServerRequest((request) => {
			Queue.offerUnsafe(serverRequests, request);
		});
		yield* Effect.forkScoped(
			Queue.take(serverRequests).pipe(
				Effect.flatMap((request) => answerServerRequest(rpc, tools, request)),
				Effect.forever,
				Effect.ignore,
			),
		);
		const request = requestOn(rpc);
		// why: the same initialize the live lane sends, from the same one place
		// that writes it. The experimental capability the ancestor filter is gated
		// behind rides on it — asking without it is refused outright — and reusing
		// the handshake is what keeps the two connections from drifting into two
		// different clients of one protocol.
		yield* handshake(request);
		rpc.notify("initialized", {});
		return { request } satisfies AuditConnection;
	});
