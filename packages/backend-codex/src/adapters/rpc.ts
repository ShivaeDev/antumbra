import type { LineProcess } from "#adapters/process.ts";
import {
	errorOf,
	isRpcId,
	parseLine,
	RPC_EXITED_CODE,
	RPC_TIMEOUT_CODE,
	type RpcError,
	type RpcId,
	type RpcNotification,
	type RpcServerRequest,
} from "#adapters/rpc-messages.ts";

export type { RpcError, RpcNotification, RpcServerRequest } from "#adapters/rpc-messages.ts";

export interface RpcConnection {
	readonly notify: (method: string, params: unknown) => void;
	readonly onNotification: (listener: (n: RpcNotification) => void) => void;
	readonly onServerRequest: (listener: (r: RpcServerRequest) => void) => void;
	readonly request: (method: string, params: unknown, timeoutMs: number) => Promise<unknown>;
	readonly respond: (id: RpcId, result: unknown) => void;
	readonly respondError: (id: RpcId, error: RpcError) => void;
}

interface Pending {
	readonly reject: (error: RpcError) => void;
	readonly resolve: (value: unknown) => void;
}

// Codex server requests carry `id` and `method`; replies carry an id without a method.
export const connectRpc = (process: LineProcess): RpcConnection => {
	const pending = new Map<number, Pending>();
	let nextId = 1;
	let notificationListener: ((n: RpcNotification) => void) | null = null;
	let serverRequestListener: ((r: RpcServerRequest) => void) | null = null;
	const send = (message: Record<string, unknown>): void => {
		process.write(JSON.stringify({ jsonrpc: "2.0", ...message }));
	};
	const settle = (message: Record<string, unknown>): void => {
		const waiting = typeof message.id === "number" ? pending.get(message.id) : undefined;
		if (waiting === undefined || typeof message.id !== "number") {
			return;
		}
		pending.delete(message.id);
		if (message.error !== undefined) {
			waiting.reject(errorOf(message.error));
			return;
		}
		waiting.resolve(message.result);
	};
	const dispatch = (message: Record<string, unknown>): void => {
		const { id, method, params } = message;
		if (typeof method !== "string") {
			settle(message);
			return;
		}
		if (id === undefined) {
			notificationListener?.({ method, params });
			return;
		}
		if (isRpcId(id)) {
			serverRequestListener?.({ id, method, params });
		}
	};
	process.onLine((line) => {
		const message = parseLine(line);
		if (message !== null) {
			dispatch(message);
		}
	});
	process.onExit(() => {
		for (const [id, waiting] of pending) {
			pending.delete(id);
			waiting.reject({ code: RPC_EXITED_CODE, message: "app-server exited" });
		}
	});
	const request = (method: string, params: unknown, timeoutMs: number): Promise<unknown> => {
		const id = nextId;
		nextId += 1;
		return new Promise<unknown>((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject({
					code: RPC_TIMEOUT_CODE,
					message: `timeout waiting for ${method}`,
				});
			}, timeoutMs);
			pending.set(id, {
				reject: (error) => {
					clearTimeout(timer);
					reject(error);
				},
				resolve: (value) => {
					clearTimeout(timer);
					resolve(value);
				},
			});
			send({ id, method, params });
		});
	};
	return {
		notify: (method, params) => send({ method, params }),
		onNotification: (listener) => {
			notificationListener = listener;
		},
		onServerRequest: (listener) => {
			serverRequestListener = listener;
		},
		request,
		respond: (id, result) => send({ id, result }),
		respondError: (id, error) => send({ error, id }),
	};
};
