import { Schema } from "effect";

export const TRPC_CHANNEL = "antumbra:trpc";

export const TrpcRequest = Schema.Struct({
	input: Schema.Unknown,
	path: Schema.String,
	type: Schema.String,
});

export type TrpcRequest = typeof TrpcRequest.Type;

export interface TrpcFailure {
	readonly error: {
		readonly code: string;
		readonly message: string;
	};
	readonly ok: false;
}

export interface TrpcSuccess {
	readonly data: unknown;
	readonly ok: true;
}

export type TrpcResponse = TrpcFailure | TrpcSuccess;

export interface AntumbraBridge {
	readonly trpc: (request: TrpcRequest) => Promise<TrpcResponse>;
}
