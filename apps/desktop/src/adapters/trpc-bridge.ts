import {
	type AppRouter,
	TRPC_CHANNEL,
	TrpcRequest,
	type TrpcResponse,
} from "@antumbra/contract";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { Result, Schema } from "effect";
import { ipcMain } from "electron";

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
	if (request.type !== "query" && request.type !== "mutation") {
		return {
			error: {
				code: "METHOD_NOT_SUPPORTED",
				message: `"${request.type}" is not supported over the invoke bridge`,
			},
			ok: false,
		};
	}
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

export const registerTrpcBridge = (router: AppRouter): void => {
	ipcMain.handle(TRPC_CHANNEL, (event, raw: unknown) =>
		respond(router, event.sender.id, raw),
	);
};
