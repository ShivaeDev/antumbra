import { describe, expect, it } from "vitest";
import { bundle, enumOf } from "#test/schema-bundle.ts";

describe("the numbers and flags this record shows a reader are the pin's", () => {
	it("the token split and the waiting flags are the bundle's, verbatim", () => {
		const breakdown = bundle.definitions.TokenUsageBreakdown?.properties;
		for (const field of ["inputTokens", "outputTokens", "cachedInputTokens", "cacheWriteInputTokens"]) {
			expect(breakdown, field).toHaveProperty(field);
		}
		expect(enumOf("ThreadActiveFlag")).toEqual(["waitingOnApproval", "waitingOnUserInput"]);
	});
});
