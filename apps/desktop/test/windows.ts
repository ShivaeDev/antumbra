import type { WindowPlace } from "@antumbra/contract";
import type { SubscriptionSender } from "#adapters/trpc-subscription-handlers.ts";
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

export interface FakeSender extends SubscriptionSender, FakeContents {
	readonly destroy: () => void;
	readonly listeners: (name: string) => number;
	readonly navigate: () => void;
}

interface Registration {
	readonly listener: () => void;
	readonly once: boolean;
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

// why: the real sender is an EventEmitter that keeps every listener handed to
// it and warns past ten. A double that holds only the newest one per name can
// never show a pile-up, which is how listeners accrued here unnoticed.
export const countingSender = (
	documentId: string,
	senderId: number,
): FakeSender => {
	const registered = new Map<string, ReadonlyArray<Registration>>();
	const add = (name: string, listener: () => void, once: boolean) => {
		registered.set(name, [...(registered.get(name) ?? []), { listener, once }]);
	};
	const fire = (name: string) => {
		const entries = registered.get(name) ?? [];
		registered.set(
			name,
			entries.filter((entry) => !entry.once),
		);
		for (const entry of entries) {
			entry.listener();
		}
	};
	const sender: FakeSender = {
		...contents(documentId),
		destroy: () => {
			sender.destroyed = true;
			fire("destroyed");
		},
		id: senderId,
		listeners: (name) => (registered.get(name) ?? []).length,
		navigate: () => fire("did-start-navigation"),
		on: (name, listener) => add(name, listener, false),
		once: (name, listener) => add(name, listener, true),
		send: () => undefined,
	};
	return sender;
};

export const eventFor = <Sender extends DocumentContents>(
	sender: Sender,
	senderFrame: DocumentFrame | null = sender.mainFrame,
) => ({ sender, senderFrame });

export const consolePlace = {
	changeId: null,
	mode: "fleet",
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

export const ownContents = <Sender extends FakeContents>(
	registry: WindowRegistry,
	sender: Sender,
	id: string,
	place: WindowPlace = transcriptPlace(id),
	handle: WindowHandle = handleFor([], id),
): OwnedWindow & { readonly contents: Sender } => {
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

export const ownWindow = (
	registry: WindowRegistry,
	id: string,
	place: WindowPlace,
	handle: WindowHandle = handleFor([], id),
): OwnedWindow & { readonly contents: FakeContents } =>
	ownContents(registry, contents(id), id, place, handle);
