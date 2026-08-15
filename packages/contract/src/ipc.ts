import { Schema } from "effect";

export const TRPC_CHANNEL = "antumbra:trpc";
export const TRPC_SUBSCRIBE_CHANNEL = "antumbra:trpc:subscribe";
export const TRPC_UNSUBSCRIBE_CHANNEL = "antumbra:trpc:unsubscribe";

export const subscriptionChannel = (id: string) =>
	`antumbra:trpc:subscription:${id}`;

export const TrpcRequest = Schema.Struct({
	input: Schema.Unknown,
	path: Schema.String,
	type: Schema.String,
});

export type TrpcRequest = typeof TrpcRequest.Type;

export const SubscribeRequest = Schema.Struct({
	id: Schema.String,
	input: Schema.Unknown,
	path: Schema.String,
});

export type SubscribeRequest = typeof SubscribeRequest.Type;

export const UnsubscribeRequest = Schema.Struct({
	id: Schema.String,
});

export type UnsubscribeRequest = typeof UnsubscribeRequest.Type;

export type SubscriptionMessage =
	| { readonly type: "data"; readonly data: unknown }
	| { readonly type: "done" }
	| { readonly type: "error"; readonly message: string };

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
	readonly subscribe: (
		request: SubscribeRequest,
		onMessage: (message: SubscriptionMessage) => void,
	) => () => void;
	readonly trpc: (request: TrpcRequest) => Promise<TrpcResponse>;
}
