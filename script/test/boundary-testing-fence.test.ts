import { describe, expect, it } from "vitest";
import { compiledBoundaryPolicy } from "#boundaries/config.ts";

describe("the fence that keeps testing out of production source", () => {
	it("matches package and app src, never test files or the testing package", () => {
		const testingRule = compiledBoundaryPolicy.configuration.forbidden.find(
			({ name }) => name === "runtime-never-imports-testing",
		);
		const consumers = new RegExp(testingRule?.from.path ?? "$^");
		expect(consumers.test("packages/domain/src/domain.ts")).toBe(true);
		expect(consumers.test("apps/desktop/src/main.ts")).toBe(true);
		expect(consumers.test("packages/domain/test/dispatcher.test.ts")).toBe(
			false,
		);
		expect(consumers.test("packages/testing/src/index.ts")).toBe(false);
		expect(consumers.test("packages/testing/test/effect-app.test.ts")).toBe(
			false,
		);
	});
});
