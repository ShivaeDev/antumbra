import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Schedule } from "effect";
import { isRpcError, RPC_OVERLOADED_CODE, type RpcConnection } from "#adapters/rpc.ts";
import { codexFailure } from "#failure.ts";

const REQUEST_TIMEOUT_MS = 30_000;

export type Request = (method: string, params: unknown, timeoutMs?: number) => Effect.Effect<unknown, BackendFailure>;

const overloaded = (failure: unknown): boolean => isRpcError(failure) && failure.code === RPC_OVERLOADED_CODE;

// why: -32001 is app-server's documented backpressure signal, to be retried
// with exponential backoff and jitter; everything else surfaces at once.
export const requestOn =
	(rpc: RpcConnection): Request =>
	(method, params, timeoutMs = REQUEST_TIMEOUT_MS) =>
		Effect.tryPromise({
			catch: (failure) => failure,
			try: () => rpc.request(method, params, timeoutMs),
		}).pipe(
			Effect.retry({
				schedule: Schedule.exponential("200 millis").pipe(Schedule.jittered, Schedule.upTo({ duration: "5 seconds" })),
				while: overloaded,
			}),
			Effect.mapError(codexFailure),
		);
