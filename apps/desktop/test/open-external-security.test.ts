import { describe, expect, it } from "@effect/vitest";
import { browsableUrl, makeOpenExternalHandler } from "#adapters/open-external.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, contents, eventFor, ownWindow } from "#test/windows.ts";

const PULL = "https://github.com/example/antumbra/pull/42";

describe("external link policy", () => {
	it("hands the browser only web addresses it can parse", () => {
		expect(browsableUrl(PULL)).toBe(PULL);
		expect(browsableUrl("http://localhost:4173/board")).toBe("http://localhost:4173/board");

		for (const refused of [
			"file:///Users/admiral/.ssh/id_ed25519",
			"javascript:alert(document.cookie)",
			"vscode://file/etc/hosts",
			"mailto:admiral@example.com",
			"//github.com/example",
			"not an address",
			"",
			42,
			null,
			undefined,
		]) {
			expect(browsableUrl(refused), String(refused)).toBeUndefined();
		}
	});

	it("opens nothing for a sender that is not an owned document", () => {
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
