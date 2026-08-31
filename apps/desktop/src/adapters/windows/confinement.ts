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
