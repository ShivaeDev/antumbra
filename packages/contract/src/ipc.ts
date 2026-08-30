import type { ProcedureType, TRPC_ERROR_CODE_KEY } from "@trpc/server";
import { Schema } from "effect";
import { type BridgeRequest, type BridgeSubscribeRequest, TRPC_FAILURE_CODES, TRPC_INVOKE_TYPES } from "#channels.ts";

export const TrpcInvokeType = Schema.Literals(TRPC_INVOKE_TYPES);
export type TrpcInvokeType = typeof TrpcInvokeType.Type;
export const TrpcFailureCode = Schema.Literals(TRPC_FAILURE_CODES);
export type TrpcFailureCode = typeof TrpcFailureCode.Type;

export const TrpcRequest = Schema.Struct({
	input: Schema.Unknown,
	path: Schema.String,
	type: TrpcInvokeType,
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

type TrpcInvokeProcedureType = Exclude<ProcedureType, "subscription">;

// why: the schemas decode what the wire carries; these bindings force the
// decoded shapes to stay assignable to the dependency-free channel types
// the preload compiles against.
const _bindRequest = (request: TrpcRequest): BridgeRequest => request;
const _bindSubscribe = (request: SubscribeRequest): BridgeSubscribeRequest => request;
const _bindFailureCodeToTrpc = (code: TrpcFailureCode): TRPC_ERROR_CODE_KEY => code;
const _bindFailureCodeFromTrpc = (code: TRPC_ERROR_CODE_KEY): TrpcFailureCode => code;
const _bindInvokeTypeToTrpc = (type: TrpcInvokeType): TrpcInvokeProcedureType => type;
const _bindInvokeTypeFromTrpc = (type: TrpcInvokeProcedureType): TrpcInvokeType => type;
void _bindRequest;
void _bindSubscribe;
void _bindFailureCodeToTrpc;
void _bindFailureCodeFromTrpc;
void _bindInvokeTypeToTrpc;
void _bindInvokeTypeFromTrpc;
