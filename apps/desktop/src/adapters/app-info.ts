import { AppInfoSource } from "@antumbra/contract";
import { Effect, Layer } from "effect";
import { app } from "electron";

export const AppInfoSourceLive = Layer.succeed(AppInfoSource, {
	current: Effect.sync(() => ({
		chromeVersion: process.versions.chrome ?? "unknown",
		electronVersion: process.versions.electron ?? "unknown",
		nodeVersion: process.versions.node ?? "unknown",
		productVersion: app.getVersion(),
	})),
});
