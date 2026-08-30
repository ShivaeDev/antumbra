import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { RpcConnection } from "#adapters/rpc.ts";
import { codexFailure } from "#failure.ts";

const REQUEST_TIMEOUT_MS = 30_000;

export type Request = (method: string, params: unknown, timeoutMs?: number) => Effect.Effect<unknown, BackendFailure>;

export const requestOn =
	(rpc: RpcConnection): Request =>
	(method, params, timeoutMs = REQUEST_TIMEOUT_MS) =>
		Effect.tryPromise({
			catch: (failure) => failure,
			try: () => rpc.request(method, params, timeoutMs),
		}).pipe(Effect.mapError(codexFailure));
