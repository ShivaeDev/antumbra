import type { WindowPlace } from "@antumbra/contract";
import type { OwnedWindow, WindowRegistry } from "#adapters/windows/registry.ts";

export interface WindowLifecycleHost {
	readonly onClosed: (listener: () => void) => void;
	readonly onRenderProcessGone: (listener: () => void) => void;
}

export interface WindowLifecycleWatch {
	readonly onClosed: () => void;
	readonly recover: () => void;
	readonly release: () => void;
}

export interface HeldAuthority {
	readonly place: () => WindowPlace;
	readonly release: () => void;
}

// Electron destroys BrowserWindow before "closed"; preserve the last place through both close and renderer-reload release.
export const holdAuthority = (registry: WindowRegistry, record: OwnedWindow): HeldAuthority => {
	let place = record.place;
	return {
		place: () => place,
		release: () => {
			place = registry.windowOf(record.id)?.place ?? place;
			registry.release(record.contents);
		},
	};
};

export const attachWindowLifecycle = (host: WindowLifecycleHost, watch: WindowLifecycleWatch): void => {
	host.onClosed(() => {
		watch.release();
		watch.onClosed();
	});
	host.onRenderProcessGone(() => {
		watch.release();
		watch.recover();
	});
};
