// why: the preload runs sandboxed and must stay dependency-free — this
// module carries the bridge protocol with no imports at all, so bundling
// it cannot drag effect or trpc into the sandbox.
export const TRPC_CHANNEL = "antumbra:trpc";
export const TRPC_SUBSCRIBE_CHANNEL = "antumbra:trpc:subscribe";
export const TRPC_UNSUBSCRIBE_CHANNEL = "antumbra:trpc:unsubscribe";

export const subscriptionChannel = (id: string) =>
	`antumbra:trpc:subscription:${id}`;

export interface BridgeRequest {
	readonly input: unknown;
	readonly path: string;
	readonly type: string;
}

export interface BridgeSubscribeRequest {
	readonly id: string;
	readonly input: unknown;
	readonly path: string;
}

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

export type SubscriptionMessage =
	| { readonly type: "data"; readonly data: unknown }
	| { readonly type: "done" }
	| { readonly type: "error"; readonly message: string };

export interface AntumbraBridge {
	readonly subscribe: (
		request: BridgeSubscribeRequest,
		onMessage: (message: SubscriptionMessage) => void,
	) => () => void;
	readonly trpc: (request: BridgeRequest) => Promise<TrpcResponse>;
}
