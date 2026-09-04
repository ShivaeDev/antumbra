interface NavigationEvent {
	readonly preventDefault: () => void;
	readonly url: string;
}

interface WindowOpenRequest {
	readonly url: string;
}

export interface WindowGuardHost {
	readonly onWillNavigate: (listener: (event: NavigationEvent) => void) => void;
	readonly setWindowOpenHandler: (handler: (request: WindowOpenRequest) => { readonly action: "deny" }) => void;
}

const staysInDocument = (document: URL, target: string): boolean => {
	const next = new URL(target);
	return document.protocol === "file:" ? next.protocol === "file:" && next.pathname === document.pathname : next.origin === document.origin;
};

export const guardWindow = (host: WindowGuardHost, document: string, openInBrowser: (url: string) => void): void => {
	const home = new URL(document);
	host.setWindowOpenHandler((request) => {
		openInBrowser(request.url);
		return { action: "deny" };
	});
	host.onWillNavigate((event) => {
		if (!staysInDocument(home, event.url)) {
			event.preventDefault();
			openInBrowser(event.url);
		}
	});
};
