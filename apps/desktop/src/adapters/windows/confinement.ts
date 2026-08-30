interface NavigationEvent {
	readonly preventDefault: () => void;
}

export interface NavigationPolicyHost {
	readonly onFrameNavigation: (listener: (event: NavigationEvent) => void) => void;
	readonly onNavigation: (listener: (event: NavigationEvent) => void) => void;
	readonly onRedirect: (listener: (event: NavigationEvent) => void) => void;
	readonly setWindowOpenHandler: (handler: () => { readonly action: "deny" }) => void;
}

export const confineNavigation = (contents: NavigationPolicyHost): void => {
	const deny = (event: NavigationEvent) => event.preventDefault();
	contents.onFrameNavigation(deny);
	contents.onNavigation(deny);
	contents.onRedirect(deny);
	contents.setWindowOpenHandler(() => ({ action: "deny" }));
};

export interface DocumentMutationHost {
	readonly destroy: () => void;
	readonly onDocumentMutation: (listener: () => void) => void;
}

export interface DocumentMutationWatch {
	readonly release: () => void;
	readonly report: () => void;
}

// why: a same-document navigation — a History API call, a hash route — moves
// the URL that keys the window's authority without firing will-navigate, so
// confinement never sees it. The only safe reading is that the trusted
// document is gone: authority is dropped before the window is destroyed, and
// the event is reported because nothing else would say why a window vanished.
export const revokeOnDocumentMutation = (host: DocumentMutationHost, watch: DocumentMutationWatch): void => {
	host.onDocumentMutation(() => {
		watch.release();
		host.destroy();
		watch.report();
	});
};
