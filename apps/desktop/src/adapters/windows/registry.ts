import type { WindowPlace } from "@antumbra/contract";
import { sameSubject } from "#adapters/windows/subject.ts";

export interface DocumentFrame {
	readonly url: string;
}

export interface DocumentContents {
	readonly mainFrame: DocumentFrame;
	readonly getURL: () => string;
	readonly isDestroyed: () => boolean;
}

export interface DocumentIpcEvent {
	readonly sender: DocumentContents;
	readonly senderFrame: DocumentFrame | null;
}

export interface WindowHandle {
	readonly close: () => void;
	readonly focus: () => void;
	readonly isMinimized: () => boolean;
	readonly restore: () => void;
	readonly show: () => void;
}

export interface OwnedWindow {
	readonly contents: DocumentContents;
	readonly document: string;
	readonly handle: WindowHandle;
	readonly id: string;
	readonly place: WindowPlace;
}

export interface WindowCandidate extends OwnedWindow {
	readonly destroy: () => void;
}

export interface WindowShell {
	readonly document: string;
	readonly registry: WindowRegistry;
}

export interface WindowRegistry {
	readonly all: () => ReadonlyArray<OwnedWindow>;
	readonly children: () => ReadonlyArray<OwnedWindow>;
	readonly consoleWindow: () => OwnedWindow | undefined;
	readonly focused: () => string | undefined;
	readonly holding: (place: WindowPlace) => OwnedWindow | undefined;
	readonly noteFocus: (id: string) => void;
	readonly onChanged: (listener: () => void) => void;
	readonly own: (record: OwnedWindow) => boolean;
	readonly owner: (event: DocumentIpcEvent) => OwnedWindow | undefined;
	readonly release: (contents: DocumentContents) => void;
	readonly remember: (id: string, place: WindowPlace) => void;
	readonly windowOf: (id: string) => OwnedWindow | undefined;
}

// why: possession of the preload is not authority by itself — every bridge
// entry proves it came from the one live main frame at the document the shell
// loaded for that window, so navigation, a reload the shell did not verify, or
// another WebContents cannot inherit the powers of a window main owns.
export const makeWindowRegistry = (): WindowRegistry => {
	const owned = new Map<DocumentContents, OwnedWindow>();
	const listeners = new Set<() => void>();
	const records = (): ReadonlyArray<OwnedWindow> => [...owned.values()];
	let inFront: string | undefined;
	// why: the roster is what gets written down, so every change to it is
	// announced from here — the one place that knows one happened — rather than
	// from each caller that might have remembered to say so.
	const changed = (): void => {
		for (const listener of listeners) {
			listener();
		}
	};
	return {
		all: records,
		children: () => records().filter((record) => record.place.role !== "console"),
		consoleWindow: () => records().find((record) => record.place.role === "console"),
		focused: () => inFront,
		holding: (place) => records().find((record) => sameSubject(record.place, place)),
		// why: which window was in front is part of where the app was left, so a
		// restart puts the same one there rather than whichever opened last.
		noteFocus: (id) => {
			if (inFront !== id) {
				inFront = id;
				changed();
			}
		},
		onChanged: (listener) => {
			listeners.add(listener);
		},
		// why: the console is the app. A second one in the same process would be
		// a second place the work is driven from, so ownership refuses it here
		// rather than trusting every caller to have asked first.
		own: (record) => {
			const taken = owned.has(record.contents) || (record.place.role === "console" && records().some((held) => held.place.role === "console"));
			if (taken) {
				return false;
			}
			owned.set(record.contents, record);
			changed();
			return true;
		},
		owner: (event) => {
			const record = owned.get(event.sender);
			if (record === undefined || event.sender.isDestroyed() || event.senderFrame === null || event.senderFrame !== event.sender.mainFrame) {
				return undefined;
			}
			return event.sender.getURL() === record.document && event.senderFrame.url === record.document ? record : undefined;
		},
		release: (contents) => {
			if (inFront === owned.get(contents)?.id) {
				inFront = undefined;
			}
			if (owned.delete(contents)) {
				changed();
			}
		},
		remember: (id, place) => {
			const record = records().find((held) => held.id === id);
			if (record !== undefined) {
				owned.set(record.contents, { ...record, place });
				changed();
			}
		},
		windowOf: (id) => records().find((record) => record.id === id),
	};
};
