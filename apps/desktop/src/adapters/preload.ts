import { AppInfo, DraftRef, DraftSnapshot, Serving, type ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import * as Channel from "@antumbra/platform-shell/channels.ts";
import { WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Result, Schema } from "effect";
import { contextBridge, ipcRenderer } from "electron";

export const installShellBridge = () =>
	contextBridge.exposeInMainWorld("antumbra", {
		server: () => ipcRenderer.invoke(Channel.SERVER_CHANNEL).then(Schema.decodeUnknownSync(Serving)),
		windowPlace: () => ipcRenderer.invoke(Channel.WINDOW_PLACE_CHANNEL).then(Schema.decodeUnknownSync(WindowPlace)),
		rememberPlace: (place) => ipcRenderer.invoke(Channel.REMEMBER_PLACE_CHANNEL, place),
		openWindow: (place) => ipcRenderer.invoke(Channel.OPEN_WINDOW_CHANNEL, place),
		restart: () => ipcRenderer.invoke(Channel.RESTART_CHANNEL),
		appInfo: () => ipcRenderer.invoke(Channel.APP_INFO_CHANNEL).then(Schema.decodeUnknownSync(AppInfo)),
		openExternal: (url) => {
			ipcRenderer.send(Channel.OPEN_EXTERNAL_CHANNEL, url);
		},
		readDraft: (ref) => {
			const key = `antumbra:session-draft:v1:${encodeURIComponent(ref.sessionId)}/${encodeURIComponent(ref.slot)}`;
			const legacy = Result.getOrElse(
				Result.try(() => window.localStorage.getItem(key)),
				() => null,
			);
			return ipcRenderer.invoke(Channel.READ_DRAFT_CHANNEL, ref, legacy).then(Schema.decodeUnknownSync(DraftSnapshot));
		},
		writeDraft: (ref, text) => ipcRenderer.invoke(Channel.WRITE_DRAFT_CHANNEL, ref, text).then(Schema.decodeUnknownSync(DraftSnapshot)),
		clearDraft: (ref, revision) => ipcRenderer.invoke(Channel.CLEAR_DRAFT_CHANNEL, ref, revision),
		subscribeDraft: (ref, listener) => {
			const receive = (_event: unknown, raw: unknown, value: unknown) => {
				const changed = Schema.decodeUnknownSync(DraftRef)(raw);
				if (changed.sessionId === ref.sessionId && changed.slot === ref.slot) listener(Schema.decodeUnknownSync(DraftSnapshot)(value));
			};
			ipcRenderer.on(Channel.DRAFT_CHANGED_CHANNEL, receive);
			return () => {
				ipcRenderer.removeListener(Channel.DRAFT_CHANGED_CHANNEL, receive);
			};
		},
	} satisfies ShellBridge);
