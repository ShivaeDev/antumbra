import { describe, expect, it } from "@effect/vitest";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, contents, eventFor, ownWindow, transcriptPlace } from "#test/windows.ts";

describe("owned window registry", () => {
	it("attributes an event to its owned window", () => {
		const registry = makeWindowRegistry();
		const foreign = contents();
		const console = ownWindow(registry, "console", consolePlace);

		expect(registry.owner(eventFor(console.contents))?.id).toBe("console");
		expect(registry.owner(eventFor(foreign))).toBeUndefined();
	});

	it("keeps each window's ownership distinct", () => {
		const registry = makeWindowRegistry();
		const console = ownWindow(registry, "console", consolePlace);
		const child = ownWindow(registry, "child", transcriptPlace("session-1"));

		expect(registry.owner(eventFor(console.contents))?.id).toBe("console");
		expect(registry.owner(eventFor(child.contents))?.id).toBe("child");
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
