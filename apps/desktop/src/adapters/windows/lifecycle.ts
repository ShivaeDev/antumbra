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

// why: the closed ending runs once Electron has destroyed the window, so
// reading the contents back off it would throw rather than hand authority
// back. The record already carries the contents the registry keyed it by, and
// that reference outlives both the destroyed wrapper and a renderer crash — a
// reload reuses the same WebContents — so neither ending reaches the window.
// Where the window was is read while the record is still held, because the
// registry no longer knows once it is gone.
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

// why: authority is released before anything else runs in both endings. A
// closed window's record would otherwise outlive the window it stands for,
// and a crashed renderer should not remain in the roster while Electron
// reloads it.
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
