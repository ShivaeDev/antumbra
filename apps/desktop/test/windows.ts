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

export const framed = (document: string, frame: string): FakeContents => ({
	destroyed: false,
	document,
	getURL() {
		return this.document;
	},
	isDestroyed() {
		return this.destroyed;
	},
	mainFrame: { url: frame },
});

export const contents = (id: string): FakeContents =>
	framed(`file:///app/${id}.html`, `file:///app/${id}.html`);

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

export const ownWindow = (
	registry: WindowRegistry,
	id: string,
	place: WindowPlace,
	handle: WindowHandle = handleFor([], id),
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
