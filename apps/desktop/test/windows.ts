import type { WindowPlace } from "@antumbra/contract";
import type {
	DocumentContents,
	DocumentFrame,
	OwnedWindow,
	WindowHandle,
	WindowRegistry,
} from "#adapters/windows/registry.ts";

export interface FakeContents extends DocumentContents {
	destroyed: boolean;
	document: string;
}

export const contents = (id: string): FakeContents => {
	const frame = { url: `file:///app/${id}.html` };
	return {
		destroyed: false,
		document: frame.url,
		getURL() {
			return this.document;
		},
		isDestroyed() {
			return this.destroyed;
		},
		mainFrame: frame,
	};
};

export const eventFor = <Sender extends DocumentContents>(
	sender: Sender,
	senderFrame: DocumentFrame | null = sender.mainFrame,
) => ({ sender, senderFrame });

export const consolePlace = {
	mode: "fleet",
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies WindowPlace;

export const transcriptPlace = (sessionId: string): WindowPlace => ({
	role: "transcript",
	sessionId,
});

export const handleFor = (
	calls: Array<string>,
	name: string,
	minimized = false,
): WindowHandle => ({
	close: () => calls.push(`close ${name}`),
	focus: () => calls.push(`focus ${name}`),
	isMinimized: () => minimized,
	restore: () => calls.push(`restore ${name}`),
	show: () => calls.push(`show ${name}`),
});

const silent: Array<string> = [];

export const ownWindow = (
	registry: WindowRegistry,
	id: string,
	place: WindowPlace,
	handle: WindowHandle = handleFor(silent, id),
): OwnedWindow & { readonly contents: FakeContents } => {
	const sender = contents(id);
	const record = {
		contents: sender,
		document: sender.document,
		handle,
		id,
		place,
	};
	registry.own(record);
	return record;
};
