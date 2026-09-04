import { OPEN_EXTERNAL_CHANNEL } from "@antumbra/contract";
import { Effect, Result, Schema } from "effect";
import { ipcMain, shell } from "electron";

const WebLink = Schema.URLFromString.check(Schema.makeFilter((url) => url.protocol === "http:" || url.protocol === "https:"));

const decodeLink = Schema.decodeUnknownResult(WebLink);

type OpenInBrowser = (url: string) => void;

export const openWebLink =
	(open: OpenInBrowser) =>
	(raw: unknown): void => {
		const decoded = decodeLink(raw);
		if (Result.isSuccess(decoded)) {
			open(decoded.success.href);
		}
	};

export const openInBrowser = openWebLink((url) => {
	Effect.promise(() => shell.openExternal(url)).pipe(
		Effect.catchCause((cause) => Effect.logError("bridge: external open failed", cause)),
		Effect.runFork,
	);
});

export const registerOpenExternal = (): void => {
	ipcMain.on(OPEN_EXTERNAL_CHANNEL, (_event, raw: unknown) => openInBrowser(raw));
};
