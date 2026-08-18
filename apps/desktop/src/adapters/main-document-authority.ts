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

export interface MainDocumentAuthority {
	readonly authorizes: (event: DocumentIpcEvent) => boolean;
	readonly own: (contents: DocumentContents, document: string) => void;
}

// why: possession of the preload is not authority by itself — every bridge
// entry proves it came from the one live main frame at the document the shell
// loaded, so navigation or a second WebContents cannot inherit app powers.
export const makeMainDocumentAuthority = (): MainDocumentAuthority => {
	let owned:
		| { readonly contents: DocumentContents; readonly document: string }
		| undefined;
	return {
		authorizes: (event) => {
			if (
				owned === undefined ||
				event.sender !== owned.contents ||
				event.sender.isDestroyed() ||
				event.senderFrame === null ||
				event.senderFrame !== event.sender.mainFrame
			) {
				return false;
			}
			return (
				event.sender.getURL() === owned.document &&
				event.senderFrame.url === owned.document
			);
		},
		own: (contents, document) => {
			owned = { contents, document };
		},
	};
};

export const mainDocumentAuthority = makeMainDocumentAuthority();
