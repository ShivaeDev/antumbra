import { describe, expect, it } from "@effect/vitest";
import { adoptWindow } from "#adapters/windows/attach.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, contents, eventFor, framed, handleFor, ownWindow, transcriptPlace } from "#test/windows.ts";

describe("owned window registry", () => {
	it("accepts only an owned live main frame at its own loaded document", () => {
		const registry = makeWindowRegistry();
		const foreign = contents("foreign");
		const console = ownWindow(registry, "console", consolePlace);

		expect(registry.owner(eventFor(console.contents))?.id).toBe("console");
		expect(registry.owner(eventFor(foreign))).toBeUndefined();
		expect(registry.owner(eventFor(console.contents, { url: console.contents.document }))).toBeUndefined();
		expect(registry.owner(eventFor(console.contents, null))).toBeUndefined();

		const loaded = console.contents.document;
		console.contents.document = `${loaded}?`;
		expect(registry.owner(eventFor(console.contents))).toBeUndefined();
		console.contents.document = loaded;
		console.contents.destroyed = true;
		expect(registry.owner(eventFor(console.contents))).toBeUndefined();
	});

	// why: the frame carries its own address, and a frame that has moved while
	// the contents still report the loaded document is the same escape.
	it("refuses a main frame whose own url is not the owned document", () => {
		const registry = makeWindowRegistry();
		const document = "file:///app/console.html";
		const drifted = framed(document, `${document}#board`);
		registry.own({
			contents: drifted,
			document,
			handle: handleFor([], "drifted"),
			id: "drifted",
			place: consolePlace,
		});

		expect(drifted.getURL()).toBe(document);
		expect(registry.owner(eventFor(drifted))).toBeUndefined();
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

		child.contents.document = console.contents.document;
		expect(registry.owner(eventFor(child.contents))).toBeUndefined();
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
		sender.document = "https://escape.example/";

		expect(
			adoptWindow(registry, {
				contents: sender,
				destroy: () => calls.push("destroy"),
				document: sender.mainFrame.url,
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
