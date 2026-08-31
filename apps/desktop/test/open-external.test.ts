import { describe, expect, it } from "@effect/vitest";
import { makeOpenExternalHandler } from "#adapters/open-external.ts";

const PULL = "https://github.com/example/antumbra/pull/42";

describe("external link policy", () => {
	it("decodes and opens an external link", () => {
		const opened: string[] = [];
		const handler = makeOpenExternalHandler((url) => {
			opened.push(url);
		});

		handler({}, 42);
		expect(opened).toEqual([]);
		handler({}, PULL);
		expect(opened).toEqual([PULL]);
	});
});
