import { OPEN_EXTERNAL_CHANNEL } from "@antumbra/contract";
import { Effect, Result, Schema } from "effect";
import { ipcMain, shell } from "electron";

const WebLink = Schema.URLFromString.check(Schema.makeFilter((url) => url.protocol === "http:" || url.protocol === "https:"));

const decodeLink = Schema.decodeUnknownResult(WebLink);

type OpenInBrowser = (url: string) => void;

export const makeOpenExternalHandler =
	(open: OpenInBrowser) =>
	(_event: unknown, raw: unknown): void => {
		const decoded = decodeLink(raw);
		if (Result.isFailure(decoded)) {
			return;
		}
		open(decoded.success.href);
	};

export const registerOpenExternal = (): void => {
	const open = (url: string) => {
		Effect.promise(() => shell.openExternal(url)).pipe(
			Effect.catchCause((cause) => Effect.logError("bridge: external open failed", cause)),
			Effect.runFork,
		);
	};
	ipcMain.on(OPEN_EXTERNAL_CHANNEL, makeOpenExternalHandler(open));
};
