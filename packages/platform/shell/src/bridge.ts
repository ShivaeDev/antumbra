import { Schema } from "effect";
import type { WindowPlace } from "#windows.ts";

export const AppInfo = Schema.Struct({
	chromeVersion: Schema.String,
	electronVersion: Schema.String,
	nodeVersion: Schema.String,
	productVersion: Schema.String,
});
export type AppInfo = typeof AppInfo.Type;
export const Serving = Schema.Struct({ port: Schema.Int, token: Schema.String });
export type Serving = typeof Serving.Type;
export const DraftRef = Schema.Struct({ sessionId: Schema.String, slot: Schema.String });
export type DraftRef = typeof DraftRef.Type;
export const DraftSnapshot = Schema.Struct({ text: Schema.String, revision: Schema.String });
export type DraftSnapshot = typeof DraftSnapshot.Type;

export interface ShellBridge {
	readonly server: () => Promise<Serving>;
	readonly windowPlace: () => Promise<WindowPlace>;
	readonly rememberPlace: (place: WindowPlace) => Promise<void>;
	readonly openWindow: (place: WindowPlace) => Promise<void>;
	readonly restart: () => Promise<void>;
	readonly appInfo: () => Promise<AppInfo>;
	readonly openExternal: (url: string) => void;
	readonly readDraft: (ref: DraftRef) => Promise<DraftSnapshot>;
	readonly writeDraft: (ref: DraftRef, text: string) => Promise<DraftSnapshot>;
	readonly clearDraft: (ref: DraftRef, revision: string) => Promise<void>;
	readonly subscribeDraft: (ref: DraftRef, listener: (snapshot: DraftSnapshot) => void) => () => void;
}
