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
	MainDocumentAuthority,
} from "#adapters/main-document-authority.ts";

const decodeRequest = Schema.decodeUnknownResult(TrpcRequest);

const respond = async (
	router: AppRouter,
	senderId: number,
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
			ctx: { senderId },
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

type BridgeExecutor = (senderId: number, raw: unknown) => Promise<TrpcResponse>;

interface BridgeEvent extends DocumentIpcEvent {
	readonly sender: DocumentIpcEvent["sender"] & { readonly id: number };
}

const unauthorized: TrpcResponse = {
	error: { code: "UNAUTHORIZED", message: "unauthorized bridge sender" },
	ok: false,
};

export const makeTrpcBridgeHandler =
	(authority: MainDocumentAuthority, execute: BridgeExecutor) =>
	(event: BridgeEvent, raw: unknown): Promise<TrpcResponse> => {
		if (!authority.authorizes(event)) {
			return Promise.resolve(unauthorized);
		}
		return execute(event.sender.id, raw);
	};

export const registerTrpcBridge = (
	router: AppRouter,
	authority: MainDocumentAuthority,
): void => {
	const handler = makeTrpcBridgeHandler(authority, (senderId, raw) =>
		respond(router, senderId, raw),
	);
	ipcMain.handle(TRPC_CHANNEL, handler);
};
