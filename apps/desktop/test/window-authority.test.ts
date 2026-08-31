import { describe, expect, it } from "@effect/vitest";
import { adoptWindow } from "#adapters/windows/attach.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, contents, eventFor, handleFor, ownWindow, transcriptPlace } from "#test/windows.ts";

describe("owned window registry", () => {
	it("accepts only an owned live main frame", () => {
		const registry = makeWindowRegistry();
		const foreign = contents("foreign");
		const console = ownWindow(registry, "console", consolePlace);

		expect(registry.owner(eventFor(console.contents))?.id).toBe("console");
		expect(registry.owner(eventFor(foreign))).toBeUndefined();
		expect(registry.owner(eventFor(console.contents, { url: console.contents.document }))).toBeUndefined();
		expect(registry.owner(eventFor(console.contents, null))).toBeUndefined();

		console.contents.destroyed = true;
		expect(registry.owner(eventFor(console.contents))).toBeUndefined();
	});

	it("never lets one window's ownership answer for another", () => {
		const registry = makeWindowRegistry();
		const console = ownWindow(registry, "console", consolePlace);
		const child = ownWindow(registry, "child", transcriptPlace("session-1"));

		expect(registry.owner(eventFor(console.contents))?.id).toBe("console");
		expect(registry.owner(eventFor(child.contents))?.id).toBe("child");
		expect(
			registry.owner({
				sender: child.contents,
				senderFrame: console.contents.mainFrame,
			}),
		).toBeUndefined();
	});

	it("refuses to own the same contents twice and to answer after release", () => {
		const registry = makeWindowRegistry();
		const child = ownWindow(registry, "child", transcriptPlace("session-1"));
		const second = { ...child, id: "impostor" };

		expect(registry.own(second)).toBe(false);
		expect(registry.owner(eventFor(child.contents))?.id).toBe("child");

		registry.release(child.contents);
		expect(registry.owner(eventFor(child.contents))).toBeUndefined();
		expect(registry.own(second)).toBe(true);
		expect(registry.owner(eventFor(child.contents))?.id).toBe("impostor");
	});

	it("keeps one console and lets a released one be replaced", () => {
		const registry = makeWindowRegistry();
		ownWindow(registry, "console", consolePlace);
		const second = ownWindow(registry, "second", consolePlace);

		expect(registry.windowOf("second")).toBeUndefined();
		expect(registry.consoleWindow()?.id).toBe("console");

		registry.release(registry.consoleWindow()?.contents ?? second.contents);
		expect(registry.own(second)).toBe(true);
		expect(registry.consoleWindow()?.id).toBe("second");
	});

	it("destroys a window that did not land on the trusted document", () => {
		const registry = makeWindowRegistry();
		const sender = contents("child");
		const calls: Array<string> = [];
		const document = sender.document;
		sender.document = "https://escape.example/";

		expect(
			adoptWindow(registry, {
				contents: sender,
				destroy: () => calls.push("destroy"),
				document,
				handle: handleFor(calls, "child"),
				id: "child",
				place: transcriptPlace("session-1"),
			}),
		).toBeUndefined();
		expect(calls).toEqual(["destroy"]);
		expect(registry.owner(eventFor(sender))).toBeUndefined();
	});

	it("knows its console, its children, and what subject each holds", () => {
		const registry = makeWindowRegistry();
		const child = ownWindow(registry, "child", transcriptPlace("session-1"));
		ownWindow(registry, "console", consolePlace);

		expect(registry.consoleWindow()?.id).toBe("console");
		expect(registry.children().map((held) => held.id)).toEqual(["child"]);
		expect(registry.holding(transcriptPlace("session-1"))?.id).toBe("child");
		expect(registry.holding(transcriptPlace("session-2"))).toBeUndefined();
		expect(registry.windowOf("child")?.place).toEqual(transcriptPlace("session-1"));

		registry.release(child.contents);
		expect(registry.children()).toEqual([]);
	});
});
