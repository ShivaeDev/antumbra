import { describe, expect, it } from "@effect/vitest";
import { openWebLink } from "#adapters/open-external.ts";

const PULL = "https://github.com/example/antumbra/pull/42";
const DOCS = "http://localhost:4321/design/";

describe("external link policy", () => {
	it("opens http and https links and refuses other schemes", () => {
		const opened: string[] = [];
		const open = openWebLink((url) => {
			opened.push(url);
		});

		open(42);
		open("file:///etc/hosts");
		open("antumbra://voyage/1");
		expect(opened).toEqual([]);

		open(PULL);
		open(DOCS);
		expect(opened).toEqual([PULL, DOCS]);
	});
});
