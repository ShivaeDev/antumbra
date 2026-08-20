import type {
	AntumbraBridge,
	AppRouter,
	BridgeRequest,
	BridgeSubscribeRequest,
	TrpcResponse,
} from "@antumbra/contract";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { type Deliver, isAsyncIterable, pump } from "#adapters/feed-pump.ts";

// why: a browser tab has no second process to authorise, so the request
// origin every procedure reads is a single fixed sender rather than a window
// id the desktop would have handed out.
const origin = { senderId: 0 };

const invoke = async (
	router: AppRouter,
	request: BridgeRequest,
): Promise<TrpcResponse> => {
	try {
		const data = await callTRPCProcedure({
			batchIndex: 0,
			ctx: origin,
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

const openFeed = async (
	router: AppRouter,
	request: BridgeSubscribeRequest,
	deliver: Deliver,
	signal: AbortSignal,
): Promise<void> => {
	try {
		const opened = await callTRPCProcedure({
			batchIndex: 0,
			ctx: origin,
			getRawInput: () => Promise.resolve(request.input),
			path: request.path,
			router,
			signal,
			type: "subscription",
		});
		if (!isAsyncIterable(opened)) {
			deliver({ message: `${request.path} is not a feed`, type: "error" });
			return;
		}
		await pump(opened, deliver, signal);
	} catch (cause) {
		if (!signal.aborted) {
			deliver({
				message: getTRPCErrorFromUnknown(cause).message,
				type: "error",
			});
		}
	}
};

export const makeBrowserBridge = (router: AppRouter): AntumbraBridge => ({
	openExternal: (url) => {
		window.open(url, "_blank", "noopener,noreferrer");
	},
	subscribe: (request, onMessage) => {
		const controller = new AbortController();
		void openFeed(router, request, onMessage, controller.signal);
		return () => {
			controller.abort();
		};
	},
	trpc: (request) => invoke(router, request),
});
