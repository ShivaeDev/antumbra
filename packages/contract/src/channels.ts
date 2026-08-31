// The preload bridge must remain dependency-free.
export const TRPC_CHANNEL = "antumbra:trpc";
export const TRPC_SUBSCRIBE_CHANNEL = "antumbra:trpc:subscribe";
export const TRPC_UNSUBSCRIBE_CHANNEL = "antumbra:trpc:unsubscribe";
export const OPEN_EXTERNAL_CHANNEL = "antumbra:open-external";

export const TRPC_INVOKE_TYPES = ["query", "mutation"] as const;
export type TrpcInvokeType = (typeof TRPC_INVOKE_TYPES)[number];

// These codes mirror tRPC's serialized error vocabulary.
export const TRPC_FAILURE_CODES = [
	"PARSE_ERROR",
	"BAD_REQUEST",
	"INTERNAL_SERVER_ERROR",
	"NOT_IMPLEMENTED",
	"BAD_GATEWAY",
	"SERVICE_UNAVAILABLE",
	"GATEWAY_TIMEOUT",
	"UNAUTHORIZED",
	"PAYMENT_REQUIRED",
	"FORBIDDEN",
	"NOT_FOUND",
	"METHOD_NOT_SUPPORTED",
	"TIMEOUT",
	"CONFLICT",
	"PRECONDITION_FAILED",
	"PAYLOAD_TOO_LARGE",
	"UNSUPPORTED_MEDIA_TYPE",
	"UNPROCESSABLE_CONTENT",
	"PRECONDITION_REQUIRED",
	"TOO_MANY_REQUESTS",
	"CLIENT_CLOSED_REQUEST",
] as const;
export type TrpcFailureCode = (typeof TRPC_FAILURE_CODES)[number];

export const subscriptionChannel = (id: string) => `antumbra:trpc:subscription:${id}`;

export interface BridgeRequest {
	readonly input: unknown;
	readonly path: string;
	readonly type: TrpcInvokeType;
}

export interface BridgeSubscribeRequest {
	readonly id: string;
	readonly input: unknown;
	readonly path: string;
}

export interface TrpcFailure {
	readonly error: {
		readonly code: TrpcFailureCode;
		readonly message: string;
	};
	readonly ok: false;
}

export interface TrpcSuccess {
	readonly data: unknown;
	readonly ok: true;
}

export type TrpcResponse = TrpcFailure | TrpcSuccess;

export type SubscriptionMessage =
	| { readonly type: "data"; readonly data: unknown }
	| { readonly type: "done" }
	| { readonly type: "error"; readonly message: string };

export interface AntumbraBridge {
	readonly openExternal: (url: string) => void;
	readonly subscribe: (request: BridgeSubscribeRequest, onMessage: (message: SubscriptionMessage) => void) => () => void;
	readonly trpc: (request: BridgeRequest) => Promise<TrpcResponse>;
}
