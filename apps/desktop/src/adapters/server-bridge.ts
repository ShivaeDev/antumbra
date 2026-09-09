import { type BridgeServing, SERVER_CHANNEL } from "@antumbra/contract";
import { ipcMain } from "electron";
import type { DocumentIpcEvent, WindowRegistry } from "#adapters/windows/registry.ts";

type Reach = () => Promise<BridgeServing>;

export const makeServerBridgeHandler =
	(registry: WindowRegistry, reach: Reach) =>
	(event: DocumentIpcEvent): Promise<BridgeServing> =>
		registry.owner(event) === undefined ? Promise.reject(new Error("unauthorized bridge sender")) : reach();

export const registerServerBridge = (registry: WindowRegistry, reach: Reach): void => {
	ipcMain.handle(SERVER_CHANNEL, makeServerBridgeHandler(registry, reach));
};
