import type { WindowPlace } from "@antumbra/contract";
import { Effect } from "effect";
import type { BrowserWindow } from "electron";
import {
	confineNavigation,
	revokeOnDocumentMutation,
} from "#adapters/windows/confinement.ts";
import { attachWindowLifecycle } from "#adapters/windows/lifecycle.ts";
import {
	adoptWindow,
	closeChildren,
	type OwnedWindow,
	type WindowShell,
} from "#adapters/windows/registry.ts";

export interface WindowOpening extends WindowShell {
	readonly place: WindowPlace;
}

type Adopt = (place: WindowPlace) => OwnedWindow | undefined;

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

const wire = (
	opening: WindowOpening,
	window: BrowserWindow,
	record: OwnedWindow,
	adopt: Adopt,
): void => {
	let place = record.place;
	const release = () => {
		place = opening.registry.windowOf(record.id)?.place ?? place;
		opening.registry.release(window.webContents);
	};
	const recover = () => {
		window.webContents.once("did-finish-load", () => {
			if (adopt(place) === undefined) {
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
			release,
			report: () =>
				report("bridge: a window left its trusted document and was closed"),
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
			onClosed: () => closeChildren(opening.registry, place),
			recover,
			release,
		},
	);
};

export const attachWindow = (
	opening: WindowOpening,
	window: BrowserWindow,
	id: string,
): OwnedWindow | undefined => {
	const adopt = adopter(opening, window, id);
	const record = adopt(opening.place);
	if (record !== undefined) {
		wire(opening, window, record, adopt);
	}
	return record;
};
