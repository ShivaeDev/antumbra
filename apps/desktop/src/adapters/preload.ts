import type { DraftRef, DraftSnapshot, ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import * as Channel from "@antumbra/platform-shell/channels.ts";
import { contextBridge, ipcRenderer } from "electron";

export const installShellBridge = () =>
	contextBridge.exposeInMainWorld("antumbra", {
		server: () => ipcRenderer.invoke(Channel.SERVER_CHANNEL),
		windowPlace: () => ipcRenderer.invoke(Channel.WINDOW_PLACE_CHANNEL),
		rememberPlace: (place) => ipcRenderer.invoke(Channel.REMEMBER_PLACE_CHANNEL, place),
		openWindow: (place) => ipcRenderer.invoke(Channel.OPEN_WINDOW_CHANNEL, place),
		restart: () => ipcRenderer.invoke(Channel.RESTART_CHANNEL),
		appInfo: () => ipcRenderer.invoke(Channel.APP_INFO_CHANNEL),
		openExternal: (url) => {
			ipcRenderer.send(Channel.OPEN_EXTERNAL_CHANNEL, url);
		},
		readDraft: (ref) => ipcRenderer.invoke(Channel.READ_DRAFT_CHANNEL, ref),
		writeDraft: (ref, text) => ipcRenderer.invoke(Channel.WRITE_DRAFT_CHANNEL, ref, text),
		clearDraft: (ref, revision) => ipcRenderer.invoke(Channel.CLEAR_DRAFT_CHANNEL, ref, revision),
		subscribeDraft: (ref, listener) => {
			const receive = (_event: unknown, changed: DraftRef, snapshot: DraftSnapshot) => {
				if (changed.sessionId === ref.sessionId && changed.slot === ref.slot) listener(snapshot);
			};
			ipcRenderer.on(Channel.DRAFT_CHANGED_CHANNEL, receive);
			return () => {
				ipcRenderer.removeListener(Channel.DRAFT_CHANGED_CHANNEL, receive);
			};
		},
	} satisfies ShellBridge);
