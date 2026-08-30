import type { WindowPlace } from "@antumbra/contract";
import { Effect } from "effect";
import type { BrowserWindow } from "electron";
import { confineNavigation, revokeOnDocumentMutation } from "#adapters/windows/confinement.ts";
import { attachWindowLifecycle, holdAuthority } from "#adapters/windows/lifecycle.ts";
import type { OwnedWindow, WindowCandidate, WindowRegistry, WindowShell } from "#adapters/windows/registry.ts";

export interface WindowOpening extends WindowShell {
	readonly place: WindowPlace;
}

type Adopt = (place: WindowPlace) => OwnedWindow | undefined;

// why: a window that did not land on the trusted document is not merely
// unowned — it is a live renderer at an address the shell never chose, so it
// is destroyed rather than left open beside the app.
export const adoptWindow = (registry: WindowRegistry, candidate: WindowCandidate): OwnedWindow | undefined => {
	const { destroy, ...record } = candidate;
	if (record.contents.getURL() !== record.document) {
		destroy();
		return undefined;
	}
	return registry.own(record) ? record : undefined;
};

// why: children hang off the console; when it goes they go with it, rather
// than keeping a windowless app alive around them.
export const closeChildren = (registry: WindowRegistry, place: WindowPlace): void => {
	for (const child of place.role === "console" ? registry.children() : []) {
		child.handle.close();
	}
};

export const confineWindow = (window: BrowserWindow): void =>
	confineNavigation({
		onFrameNavigation: (listener) => {
			window.webContents.on("will-frame-navigate", listener);
		},
		onNavigation: (listener) => {
			window.webContents.on("will-navigate", listener);
		},
		onRedirect: (listener) => {
			window.webContents.on("will-redirect", listener);
		},
		setWindowOpenHandler: (handler) => {
			window.webContents.setWindowOpenHandler(handler);
		},
	});

const report = (message: string): void => {
	Effect.runFork(Effect.logWarning(message));
};

const adopter =
	(opening: WindowOpening, window: BrowserWindow, id: string): Adopt =>
	(place) =>
		adoptWindow(opening.registry, {
			contents: window.webContents,
			destroy: () => window.destroy(),
			document: opening.document,
			handle: window,
			id,
			place,
		});

const wire = (opening: WindowOpening, window: BrowserWindow, record: OwnedWindow, adopt: Adopt): void => {
	const authority = holdAuthority(opening.registry, record);
	window.on("focus", () => opening.registry.noteFocus(record.id));
	const recover = () => {
		window.webContents.once("did-finish-load", () => {
			if (adopt(authority.place()) === undefined) {
				report("bridge: a reloaded window did not return to its document");
			}
		});
		window.webContents.reload();
	};
	revokeOnDocumentMutation(
		{
			destroy: () => window.destroy(),
			onDocumentMutation: (listener) => {
				window.webContents.on("did-navigate-in-page", listener);
			},
		},
		{
			release: authority.release,
			report: () => report("bridge: a window left its trusted document and was closed"),
		},
	);
	attachWindowLifecycle(
		{
			onClosed: (listener) => {
				window.on("closed", listener);
			},
			onRenderProcessGone: (listener) => {
				window.webContents.on("render-process-gone", listener);
			},
		},
		{
			onClosed: () => closeChildren(opening.registry, authority.place()),
			recover,
			release: authority.release,
		},
	);
};

export const attachWindow = (opening: WindowOpening, window: BrowserWindow, id: string): OwnedWindow | undefined => {
	const adopt = adopter(opening, window, id);
	const record = adopt(opening.place);
	if (record !== undefined) {
		wire(opening, window, record, adopt);
	}
	return record;
};
