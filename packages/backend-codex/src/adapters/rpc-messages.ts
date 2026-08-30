export type RpcId = number | string;

export interface RpcError {
	readonly code: number;
	readonly message: string;
}

export interface RpcNotification {
	readonly method: string;
	readonly params: unknown;
}

export interface RpcServerRequest {
	readonly id: RpcId;
	readonly method: string;
	readonly params: unknown;
}

export const RPC_TIMEOUT_CODE = -1;
export const RPC_EXITED_CODE = -32000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isRpcError = (value: unknown): value is RpcError => isRecord(value) && typeof value.code === "number" && typeof value.message === "string";

export const isRpcId = (value: unknown): value is RpcId => typeof value === "number" || typeof value === "string";

export const parseLine = (line: string): Record<string, unknown> | null => {
	try {
		const parsed: unknown = JSON.parse(line);
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

export const errorOf = (raw: unknown): RpcError =>
	isRpcError(raw) ? { code: raw.code, message: raw.message } : { code: -32603, message: String(raw) };
