import { describe, expect, it } from "@effect/vitest";
import { closeChildren } from "#adapters/windows/attach.ts";
import { confineNavigation, type NavigationPolicyHost, revokeOnDocumentMutation } from "#adapters/windows/confinement.ts";
import { attachWindowLifecycle, holdAuthority } from "#adapters/windows/lifecycle.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, handleFor, ownWindow, transcriptPlace } from "#test/windows.ts";

describe("window confinement", () => {
	it("denies navigation, redirects, frame navigation, and new windows", () => {
		const listeners = new Map<string, (event: { preventDefault(): void }) => void>();
		let openWindow: (() => { readonly action: "deny" }) | undefined;
		const host: NavigationPolicyHost = {
			onFrameNavigation: (listener) => listeners.set("will-frame-navigate", listener),
			onNavigation: (listener) => listeners.set("will-navigate", listener),
			onRedirect: (listener) => listeners.set("will-redirect", listener),
			setWindowOpenHandler: (handler) => {
				openWindow = handler;
			},
		};
		confineNavigation(host);

		for (const name of ["will-navigate", "will-frame-navigate", "will-redirect"]) {
			let denied = false;
			listeners.get(name)?.({ preventDefault: () => (denied = true) });
			expect(denied, name).toBe(true);
		}
		expect(openWindow?.()).toEqual({ action: "deny" });
	});

	// why: will-navigate never fires for a same-document move, so this is the
	// only guard between a History API call and a window whose authority key no
	// longer matches the document it was owned at.
	it("releases before destroying a window that rewrote its own document", () => {
		const calls: Array<string> = [];
		let mutate: (() => void) | undefined;
		revokeOnDocumentMutation(
			{
				destroy: () => calls.push("destroy"),
				onDocumentMutation: (listener) => {
					mutate = listener;
				},
			},
			{
				release: () => calls.push("release"),
				report: () => calls.push("report"),
			},
		);

		expect(calls).toEqual([]);
		mutate?.();
		expect(calls).toEqual(["release", "destroy", "report"]);
	});

	it("releases before recovering a crash and before a close is acted on", () => {
		const calls: Array<string> = [];
		let closed: (() => void) | undefined;
		let gone: (() => void) | undefined;
		attachWindowLifecycle(
			{
				onClosed: (listener) => {
					closed = listener;
				},
				onRenderProcessGone: (listener) => {
					gone = listener;
				},
			},
			{
				onClosed: () => calls.push("closed"),
				recover: () => calls.push("recover"),
				release: () => calls.push("release"),
			},
		);

		gone?.();
		expect(calls).toEqual(["release", "recover"]);
		closed?.();
		expect(calls).toEqual(["release", "recover", "release", "closed"]);
	});

	// why: where a window moved to lives in the registry only as long as its
	// record does, so an ending reads it on the way out. Releasing first would
	// leave both endings acting on the place the window opened at.
	it("hands authority back and keeps the place the window last reported", () => {
		const registry = makeWindowRegistry();
		const record = ownWindow(registry, "child", transcriptPlace("session-1"));
		const authority = holdAuthority(registry, record);

		registry.remember("child", transcriptPlace("session-2"));
		authority.release();

		expect(registry.all()).toEqual([]);
		expect(authority.place()).toEqual(transcriptPlace("session-2"));
	});

	it("takes every child down with the console and leaves a child's close alone", () => {
		const registry = makeWindowRegistry();
		const calls: Array<string> = [];
		ownWindow(registry, "console", consolePlace);
		ownWindow(registry, "child", transcriptPlace("session-1"), handleFor(calls, "child"));
		ownWindow(registry, "other", transcriptPlace("session-2"), handleFor(calls, "other"));

		closeChildren(registry, transcriptPlace("session-1"));
		expect(calls).toEqual([]);
		closeChildren(registry, consolePlace);
		expect(calls).toEqual(["close child", "close other"]);
	});
});
