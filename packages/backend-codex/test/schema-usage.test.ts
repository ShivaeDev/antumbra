import { describe, expect, it } from "vitest";
import { bundle, enumOf } from "#test/schema-bundle.ts";

describe("the numbers and flags this record shows a reader are the pin's", () => {
	// why: the four token counts a turn is read by, and the two flags that tell
	// a running turn from one stalled on an answer. Both are what this record
	// shows a reader, so a pin that renamed either would silently blank the
	// split or turn every waiting turn back into an ordinary running one.
	it("the token split and the waiting flags are the bundle's, verbatim", () => {
		const breakdown = bundle.definitions.TokenUsageBreakdown?.properties;
		for (const field of [
			"inputTokens",
			"outputTokens",
			"cachedInputTokens",
			"cacheWriteInputTokens",
		]) {
			expect(breakdown, field).toHaveProperty(field);
		}
		expect(enumOf("ThreadActiveFlag")).toEqual([
			"waitingOnApproval",
			"waitingOnUserInput",
		]);
	});
});
