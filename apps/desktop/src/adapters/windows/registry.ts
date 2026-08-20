import type { WindowPlace } from "@antumbra/contract";

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
	readonly children: () => ReadonlyArray<OwnedWindow>;
	readonly consoleWindow: () => OwnedWindow | undefined;
	readonly holding: (place: WindowPlace) => OwnedWindow | undefined;
	readonly own: (record: OwnedWindow) => boolean;
	readonly owner: (event: DocumentIpcEvent) => OwnedWindow | undefined;
	readonly release: (contents: DocumentContents) => void;
	readonly remember: (id: string, place: WindowPlace) => void;
	readonly windowOf: (id: string) => OwnedWindow | undefined;
}

// why: a window is opened for one subject, so a second window for the same
// subject is the same window asked for twice.
const sameSubject = (held: WindowPlace, wanted: WindowPlace): boolean =>
	held.role === "console"
		? wanted.role === "console"
		: wanted.role === held.role && wanted.sessionId === held.sessionId;

// why: possession of the preload is not authority by itself — every bridge
// entry proves it came from the one live main frame at the document the shell
// loaded for that window, so navigation, a reload the shell did not verify, or
// another WebContents cannot inherit the powers of a window main owns.
export const makeWindowRegistry = (): WindowRegistry => {
	const owned = new Map<DocumentContents, OwnedWindow>();
	const records = (): ReadonlyArray<OwnedWindow> => [...owned.values()];
	return {
		children: () =>
			records().filter((record) => record.place.role !== "console"),
		consoleWindow: () =>
			records().find((record) => record.place.role === "console"),
		holding: (place) =>
			records().find((record) => sameSubject(record.place, place)),
		own: (record) => {
			if (owned.has(record.contents)) {
				return false;
			}
			owned.set(record.contents, record);
			return true;
		},
		owner: (event) => {
			const record = owned.get(event.sender);
			if (
				record === undefined ||
				event.sender.isDestroyed() ||
				event.senderFrame === null ||
				event.senderFrame !== event.sender.mainFrame
			) {
				return undefined;
			}
			return event.sender.getURL() === record.document &&
				event.senderFrame.url === record.document
				? record
				: undefined;
		},
		release: (contents) => {
			owned.delete(contents);
		},
		remember: (id, place) => {
			const record = records().find((held) => held.id === id);
			if (record !== undefined) {
				owned.set(record.contents, { ...record, place });
			}
		},
		windowOf: (id) => records().find((record) => record.id === id),
	};
};

// why: a window that did not land on the trusted document is not merely
// unowned — it is a live renderer at an address the shell never chose, so it
// is destroyed rather than left open beside the app.
export const adoptWindow = (
	registry: WindowRegistry,
	candidate: WindowCandidate,
): OwnedWindow | undefined => {
	const { destroy, ...record } = candidate;
	if (record.contents.getURL() !== record.document) {
		destroy();
		return undefined;
	}
	return registry.own(record) ? record : undefined;
};

// why: children hang off the console; when it goes they go with it, rather
// than keeping a windowless app alive around them.
export const closeChildren = (
	registry: WindowRegistry,
	place: WindowPlace,
): void => {
	for (const child of place.role === "console" ? registry.children() : []) {
		child.handle.close();
	}
};
