import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { WindowPlace } from "@antumbra/contract";
import { Effect } from "effect";
import { app, BrowserWindow } from "electron";
import { selectRendererDocument } from "#adapters/renderer-document.ts";
import {
	attachWindow,
	confineWindow,
	type WindowOpening,
} from "#adapters/windows/attach.ts";
import { defaultConsole } from "#adapters/windows/layout.ts";
import type { WindowShell } from "#adapters/windows/registry.ts";

// why: one document string serves every window; which window is which lives in
// the registry, never in the address a window is asked to prove.
export const rendererDocument = Effect.suspend(() =>
	selectRendererDocument({
		arguments: process.argv,
		bundled: pathToFileURL(
			join(import.meta.dirname, "renderer", "index.html"),
		).toString(),
		isPackaged: app.isPackaged,
	}),
);

// why: the shell names a window from what it knows before the page has said
// anything, so it is never briefly untitled. The page refines it afterwards,
// which is how an artifact window ends up carrying the artifact's own name.
const windowTitle = (place: WindowPlace): string => {
	if (place.role === "console") {
		return "Antumbra";
	}
	return place.role === "artifact"
		? "Artifact"
		: `Session ${place.sessionId.slice(0, 8)}`;
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
		confineWindow(window);
		yield* Effect.promise(() => window.loadURL(opening.document));
		const record = attachWindow(opening, window, crypto.randomUUID());
		return record === undefined
			? yield* Effect.die(
					new Error("window did not load its trusted app document"),
				)
			: record;
	});

// why: the app is one console — a launch, a second launch, and a console that
// was closed while children stayed open all end at the same single window.
export const openConsole = (shell: WindowShell) =>
	Effect.asVoid(openWindow({ ...shell, place: defaultConsole }));
