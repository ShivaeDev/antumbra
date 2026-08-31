import { describe, expect, it } from "@effect/vitest";
import { closeChildren } from "#adapters/windows/attach.ts";
import { attachWindowLifecycle, holdAuthority } from "#adapters/windows/lifecycle.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, handleFor, ownWindow, transcriptPlace } from "#test/windows.ts";

describe("window lifecycle", () => {
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
