import { OPEN_EXTERNAL_CHANNEL } from "@antumbra/contract";
import { Effect, Result, Schema } from "effect";
import { ipcMain, shell } from "electron";
import type { DocumentIpcEvent, WindowRegistry } from "#adapters/windows/registry.ts";

const decodeUrl = Schema.decodeUnknownResult(Schema.String);

// why: the operating system chooses a program from the scheme, so a link the
// window refuses to follow must still be narrowed to the two protocols a
// browser owns before it leaves the app.
const BROWSABLE_PROTOCOLS = new Set(["http:", "https:"]);

export const browsableUrl = (raw: unknown): string | undefined => {
	const decoded = decodeUrl(raw);
	if (Result.isFailure(decoded)) {
		return undefined;
	}
	const parsed = URL.parse(decoded.success);
	return parsed === null || !BROWSABLE_PROTOCOLS.has(parsed.protocol) ? undefined : parsed.href;
};

type OpenInBrowser = (url: string) => void;

export const makeOpenExternalHandler =
	(registry: WindowRegistry, open: OpenInBrowser) =>
	(event: DocumentIpcEvent, raw: unknown): void => {
		if (registry.owner(event) === undefined) {
			return;
		}
		const url = browsableUrl(raw);
		if (url === undefined) {
			Effect.runFork(Effect.logWarning("bridge: refused a link outside http and https", raw));
			return;
		}
		open(url);
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
