import type { Request } from "#requests.ts";
import type { RpcError, RpcId, RpcNotification, RpcServerRequest } from "#rpc-messages.ts";

export type { RpcError, RpcNotification, RpcServerRequest } from "#rpc-messages.ts";

export interface RpcConnection {
	readonly notify: (method: string, params: unknown) => void;
	readonly onNotification: (listener: (n: RpcNotification) => void) => void;
	readonly onServerRequest: (listener: (r: RpcServerRequest) => void) => void;
	readonly request: Request;
	readonly respond: (id: RpcId, result: unknown) => void;
	readonly respondError: (id: RpcId, error: RpcError) => void;
}
