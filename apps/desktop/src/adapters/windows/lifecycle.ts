export interface WindowLifecycleHost {
	readonly onClosed: (listener: () => void) => void;
	readonly onRenderProcessGone: (listener: () => void) => void;
}

export interface WindowLifecycleWatch {
	readonly onClosed: () => void;
	readonly recover: () => void;
	readonly release: () => void;
}

// why: authority is released before anything else runs in both endings. A
// closed window's record would otherwise outlive the window it stands for,
// and a crashed renderer keeps its WebContents while losing its page — the
// page that comes back from a reload is a new principal and has to prove the
// trusted document again before it is owned.
export const attachWindowLifecycle = (
	host: WindowLifecycleHost,
	watch: WindowLifecycleWatch,
): void => {
	host.onClosed(() => {
		watch.release();
		watch.onClosed();
	});
	host.onRenderProcessGone(() => {
		watch.release();
		watch.recover();
	});
};
