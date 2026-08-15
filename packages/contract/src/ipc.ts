import { Schema } from "effect";
import type { BridgeRequest, BridgeSubscribeRequest } from "#channels.ts";

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

// why: the schemas decode what the wire carries; these bindings force the
// decoded shapes to stay assignable to the dependency-free channel types
// the preload compiles against.
const _bindRequest = (request: TrpcRequest): BridgeRequest => request;
const _bindSubscribe = (request: SubscribeRequest): BridgeSubscribeRequest =>
	request;
void _bindRequest;
void _bindSubscribe;
