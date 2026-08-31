import { describe, expect, it } from "@effect/vitest";
import { makeOpenExternalHandler } from "#adapters/open-external.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, contents, eventFor, ownWindow } from "#test/windows.ts";

const PULL = "https://github.com/example/antumbra/pull/42";

describe("external link policy", () => {
	it("opens an owned document's external link", () => {
		const registry = makeWindowRegistry();
		const owned = ownWindow(registry, "console", consolePlace);
		const foreign = contents("foreign");
		const opened: string[] = [];
		const handler = makeOpenExternalHandler(registry, (url) => {
			opened.push(url);
		});

		handler(eventFor(foreign), PULL);
		expect(opened).toEqual([]);

		handler(eventFor(owned.contents), PULL);
		expect(opened).toEqual([PULL]);
	});
});
