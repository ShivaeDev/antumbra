import type { AppInfo } from "@antumbra/platform-shell/bridge.ts";
import { Effect } from "effect";
import { version } from "#package.json";

export const appInfo: Effect.Effect<AppInfo> = Effect.sync(() => ({
	chromeVersion: process.versions.chrome ?? "unknown",
	electronVersion: process.versions.electron ?? "unknown",
	nodeVersion: process.versions.node ?? "unknown",
	productVersion: version,
}));
