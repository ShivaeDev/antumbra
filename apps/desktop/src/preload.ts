import { TRPC_CHANNEL, type TrpcRequest } from "@antumbra/contract";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("antumbra", {
	trpc: (request: TrpcRequest) => ipcRenderer.invoke(TRPC_CHANNEL, request),
});
