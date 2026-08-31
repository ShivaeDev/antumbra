import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { WindowPlace } from "@antumbra/contract";
import { Effect } from "effect";
import { app, BrowserWindow } from "electron";
import { selectRendererDocument } from "#adapters/renderer-document.ts";
import { attachWindow, type WindowOpening } from "#adapters/windows/attach.ts";
import { defaultConsole } from "#adapters/windows/layout.ts";
import type { WindowShell } from "#adapters/windows/registry.ts";

export const rendererDocument = Effect.sync(() =>
	selectRendererDocument({
		arguments: process.argv,
		bundled: pathToFileURL(join(import.meta.dirname, "renderer", "index.html")).toString(),
		isPackaged: app.isPackaged,
	}),
);

const windowTitle = (place: WindowPlace): string => {
	if (place.role === "console") {
		return "Antumbra";
	}
	return place.role === "artifact" ? "Artifact" : `Session ${place.sessionId.slice(0, 8)}`;
};

const construct = (place: WindowPlace): BrowserWindow =>
	new BrowserWindow({
		height: 760,
		title: windowTitle(place),
		webPreferences: {
			contextIsolation: true,
			preload: join(import.meta.dirname, "preload.cjs"),
			sandbox: true,
		},
		width: place.role === "console" ? 1120 : 780,
	});

export const openWindow = (opening: WindowOpening) =>
	Effect.gen(function* () {
		const window = yield* Effect.sync(() => construct(opening.place));
		yield* Effect.promise(() => window.loadURL(opening.document));
		const record = attachWindow(opening, window, crypto.randomUUID());
		return record === undefined ? yield* Effect.die(new Error("window could not be owned")) : record;
	});

export const openConsole = (shell: WindowShell) => Effect.asVoid(openWindow({ ...shell, place: defaultConsole }));
