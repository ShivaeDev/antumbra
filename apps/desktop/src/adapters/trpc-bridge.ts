import {
	type AppRouter,
	TRPC_CHANNEL,
	TrpcRequest,
	type TrpcResponse,
} from "@antumbra/contract";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { Result, Schema } from "effect";
import { ipcMain } from "electron";
import type {
	DocumentIpcEvent,
	WindowRegistry,
} from "#adapters/windows/registry.ts";

const decodeRequest = Schema.decodeUnknownResult(TrpcRequest);

const respond = async (
	router: AppRouter,
	windowId: string,
	raw: unknown,
): Promise<TrpcResponse> => {
	const decoded = decodeRequest(raw);
	if (Result.isFailure(decoded)) {
		return {
			error: { code: "BAD_REQUEST", message: "malformed bridge request" },
			ok: false,
		};
	}
	const request = decoded.success;
	try {
		const data = await callTRPCProcedure({
			batchIndex: 0,
			ctx: { windowId },
			getRawInput: () => Promise.resolve(request.input),
			path: request.path,
			router,
			signal: undefined,
			type: request.type,
		});
		return { data, ok: true };
	} catch (cause) {
		const error = getTRPCErrorFromUnknown(cause);
		return { error: { code: error.code, message: error.message }, ok: false };
	}
};

type BridgeExecutor = (windowId: string, raw: unknown) => Promise<TrpcResponse>;

const unauthorized: TrpcResponse = {
	error: { code: "UNAUTHORIZED", message: "unauthorized bridge sender" },
	ok: false,
};

export const makeTrpcBridgeHandler =
	(registry: WindowRegistry, execute: BridgeExecutor) =>
	(event: DocumentIpcEvent, raw: unknown): Promise<TrpcResponse> => {
		const record = registry.owner(event);
		if (record === undefined) {
			return Promise.resolve(unauthorized);
		}
		return execute(record.id, raw);
	};

export const registerTrpcBridge = (
	router: AppRouter,
	registry: WindowRegistry,
): void => {
	const handler = makeTrpcBridgeHandler(registry, (windowId, raw) =>
		respond(router, windowId, raw),
	);
	ipcMain.handle(TRPC_CHANNEL, handler);
};
