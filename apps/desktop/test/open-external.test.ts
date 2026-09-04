import { describe, expect, it } from "@effect/vitest";
import { makeOpenExternalHandler } from "#adapters/open-external.ts";

const PULL = "https://github.com/example/antumbra/pull/42";
const DOCS = "http://localhost:4321/design/";

describe("external link policy", () => {
	it("opens http and https links and refuses other schemes", () => {
		const opened: string[] = [];
		const handler = makeOpenExternalHandler((url) => {
			opened.push(url);
		});

		handler({}, 42);
		handler({}, "file:///etc/hosts");
		handler({}, "antumbra://voyage/1");
		expect(opened).toEqual([]);

		handler({}, PULL);
		handler({}, DOCS);
		expect(opened).toEqual([PULL, DOCS]);
	});
});
