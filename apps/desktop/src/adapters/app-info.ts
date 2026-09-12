import type { AppInfo } from "@antumbra/platform-shell/bridge.ts";
import { Effect } from "effect";
import { app } from "electron";

export const appInfo: Effect.Effect<AppInfo> = Effect.sync(() => ({
	chromeVersion: process.versions.chrome ?? "unknown",
	electronVersion: process.versions.electron ?? "unknown",
	nodeVersion: process.versions.node ?? "unknown",
	productVersion: app.getVersion(),
}));
