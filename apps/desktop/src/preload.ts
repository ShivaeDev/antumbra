import {
	type SubscribeRequest,
	type SubscriptionMessage,
	subscriptionChannel,
	TRPC_CHANNEL,
	TRPC_SUBSCRIBE_CHANNEL,
	TRPC_UNSUBSCRIBE_CHANNEL,
	type TrpcRequest,
} from "@antumbra/contract";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("antumbra", {
	subscribe: (
		request: SubscribeRequest,
		onMessage: (message: SubscriptionMessage) => void,
	) => {
		const channel = subscriptionChannel(request.id);
		const listener = (_event: unknown, message: SubscriptionMessage) =>
			onMessage(message);
		ipcRenderer.on(channel, listener);
		ipcRenderer.send(TRPC_SUBSCRIBE_CHANNEL, request);
		return () => {
			ipcRenderer.removeListener(channel, listener);
			ipcRenderer.send(TRPC_UNSUBSCRIBE_CHANNEL, { id: request.id });
		};
	},
	trpc: (request: TrpcRequest) => ipcRenderer.invoke(TRPC_CHANNEL, request),
});
