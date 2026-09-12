import type { WindowPlace } from "@antumbra/platform-shell/windows.ts";

import type { DocumentContents, OwnedWindow, WindowHandle, WindowRegistry } from "#adapters/windows/registry.ts";

export interface FakeContents extends DocumentContents {
	destroyed: boolean;
}

export const contents = (): FakeContents => ({
	destroyed: false,
	isDestroyed() {
		return this.destroyed;
	},
});

export const eventFor = <Sender extends DocumentContents>(sender: Sender) => ({ sender });

export const consolePlace = {
	changeId: null,
	mode: "flagship",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies WindowPlace;

export const transcriptPlace = (sessionId: string): WindowPlace => ({
	role: "transcript",
	sessionId,
});

export const artifactPlace = (artifactId: string): WindowPlace => ({
	artifactId,
	role: "artifact",
});

export const handleFor = (calls: Array<string>, name: string, minimized = false): WindowHandle => ({
	close: () => calls.push(`close ${name}`),
	focus: () => calls.push(`focus ${name}`),
	isMinimized: () => minimized,
	restore: () => calls.push(`restore ${name}`),
	show: () => calls.push(`show ${name}`),
});

export const ownContents = <Sender extends FakeContents>(
	registry: WindowRegistry,
	sender: Sender,
	id: string,
	place: WindowPlace = transcriptPlace(id),
	handle: WindowHandle = handleFor([], id),
): OwnedWindow & { readonly contents: Sender } => {
	const record = {
		contents: sender,
		handle,
		id,
		place,
	};
	registry.own(record);
	return record;
};

export const ownWindow = (
	registry: WindowRegistry,
	id: string,
	place: WindowPlace,
	handle: WindowHandle = handleFor([], id),
): OwnedWindow & { readonly contents: FakeContents } => ownContents(registry, contents(), id, place, handle);
