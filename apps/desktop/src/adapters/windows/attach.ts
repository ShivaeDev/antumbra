import type { WindowPlace } from "@antumbra/contract";
import { Effect } from "effect";
import type { BrowserWindow } from "electron";
import { attachWindowLifecycle, holdAuthority } from "#adapters/windows/lifecycle.ts";
import type { OwnedWindow, WindowRegistry, WindowShell } from "#adapters/windows/registry.ts";

export interface WindowOpening extends WindowShell {
	readonly place: WindowPlace;
}

type Adopt = (place: WindowPlace) => OwnedWindow | undefined;

// why: children hang off the console; when it goes they go with it, rather
// than keeping a windowless app alive around them.
export const closeChildren = (registry: WindowRegistry, place: WindowPlace): void => {
	for (const child of place.role === "console" ? registry.children() : []) {
		child.handle.close();
	}
};

const report = (message: string): void => {
	Effect.runFork(Effect.logWarning(message));
};

const adopter =
	(opening: WindowOpening, window: BrowserWindow, id: string): Adopt =>
	(place) => {
		const record = {
			contents: window.webContents,
			handle: window,
			id,
			place,
		};
		return opening.registry.own(record) ? record : undefined;
	};

const wire = (opening: WindowOpening, window: BrowserWindow, record: OwnedWindow, adopt: Adopt): void => {
	const authority = holdAuthority(opening.registry, record);
	window.on("focus", () => opening.registry.noteFocus(record.id));
	const recover = () => {
		window.webContents.once("did-finish-load", () => {
			if (adopt(authority.place()) === undefined) {
				report("bridge: a reloaded window could not reclaim its place");
			}
		});
		window.webContents.reload();
	};
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
