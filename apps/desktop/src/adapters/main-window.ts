import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { app, BrowserWindow } from "electron";
import { mainDocumentAuthority } from "#adapters/main-document-authority.ts";
import { selectRendererDocument } from "#adapters/renderer-document.ts";

interface NavigationEvent {
	readonly preventDefault: () => void;
}

export interface NavigationPolicyHost {
	readonly onFrameNavigation: (
		listener: (event: NavigationEvent) => void,
	) => void;
	readonly onNavigation: (listener: (event: NavigationEvent) => void) => void;
	readonly onRedirect: (listener: (event: NavigationEvent) => void) => void;
	readonly setWindowOpenHandler: (
		handler: () => { readonly action: "deny" },
	) => void;
}

export const confineNavigation = (contents: NavigationPolicyHost): void => {
	const deny = (event: NavigationEvent) => event.preventDefault();
	contents.onFrameNavigation(deny);
	contents.onNavigation(deny);
	contents.onRedirect(deny);
	contents.setWindowOpenHandler(() => ({ action: "deny" }));
};

const confineMainWindow = (contents: BrowserWindow["webContents"]): void =>
	confineNavigation({
		onFrameNavigation: (listener) => {
			contents.on("will-frame-navigate", listener);
		},
		onNavigation: (listener) => {
			contents.on("will-navigate", listener);
		},
		onRedirect: (listener) => {
			contents.on("will-redirect", listener);
		},
		setWindowOpenHandler: (handler) => {
			contents.setWindowOpenHandler(handler);
		},
	});

export const openMainWindow = () =>
	Effect.gen(function* () {
		const bundled = pathToFileURL(
			join(import.meta.dirname, "renderer", "index.html"),
		).toString();
		const document = yield* selectRendererDocument({
			arguments: process.argv,
			bundled,
			isPackaged: app.isPackaged,
		});
		const window = yield* Effect.sync(
			() =>
				new BrowserWindow({
					height: 760,
					title: "Antumbra",
					webPreferences: {
						contextIsolation: true,
						preload: join(import.meta.dirname, "preload.cjs"),
						sandbox: true,
					},
					width: 1120,
				}),
		);
		confineMainWindow(window.webContents);
		yield* Effect.promise(() => window.loadURL(document));
		if (window.webContents.getURL() !== document) {
			window.destroy();
			return yield* Effect.die(
				new Error("main window did not load its trusted app document"),
			);
		}
		mainDocumentAuthority.own(window.webContents, document);
	});
