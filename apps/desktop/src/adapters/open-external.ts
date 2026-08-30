import { OPEN_EXTERNAL_CHANNEL } from "@antumbra/contract";
import { Effect } from "effect";
import { ipcMain, shell } from "electron";
import type { DocumentIpcEvent, WindowRegistry } from "#adapters/windows/registry.ts";

type OpenInBrowser = (url: string) => void;

export const makeOpenExternalHandler =
	(registry: WindowRegistry, open: OpenInBrowser) =>
	(event: DocumentIpcEvent, raw: unknown): void => {
		if (registry.owner(event) === undefined || typeof raw !== "string") {
			return;
		}
		open(raw);
	};

export const registerOpenExternal = (registry: WindowRegistry): void => {
	const open = (url: string) => {
		Effect.promise(() => shell.openExternal(url)).pipe(
			Effect.catchCause((cause) => Effect.logError("bridge: external open failed", cause)),
			Effect.runFork,
		);
	};
	ipcMain.on(OPEN_EXTERNAL_CHANNEL, makeOpenExternalHandler(registry, open));
};
