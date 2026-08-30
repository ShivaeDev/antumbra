import {
	type AntumbraBridge,
	type BridgeRequest,
	type BridgeSubscribeRequest,
	OPEN_EXTERNAL_CHANNEL,
	type SubscriptionMessage,
	subscriptionChannel,
	TRPC_CHANNEL,
	TRPC_SUBSCRIBE_CHANNEL,
	TRPC_UNSUBSCRIBE_CHANNEL,
	type TrpcResponse,
} from "@antumbra/contract/channels";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("antumbra", {
	openExternal: (url: string) => {
		ipcRenderer.send(OPEN_EXTERNAL_CHANNEL, url);
	},
	subscribe: (request: BridgeSubscribeRequest, onMessage: (message: SubscriptionMessage) => void) => {
		const channel = subscriptionChannel(request.id);
		const listener = (_event: unknown, message: SubscriptionMessage) => onMessage(message);
		ipcRenderer.on(channel, listener);
		ipcRenderer.send(TRPC_SUBSCRIBE_CHANNEL, request);
		return () => {
			ipcRenderer.removeListener(channel, listener);
			ipcRenderer.send(TRPC_UNSUBSCRIBE_CHANNEL, { id: request.id });
		};
	},
	// why: ipcRenderer.invoke is Promise<any>, so the annotation is what stops
	// electron's untyped reply at the boundary the renderer trusts.
	trpc: (request: BridgeRequest): Promise<TrpcResponse> => ipcRenderer.invoke(TRPC_CHANNEL, request),
} satisfies AntumbraBridge);
