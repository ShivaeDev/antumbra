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

	it("a reroute names the model the work moved to and why", () => {
		expect(bundle.definitions.ModelReroutedNotification?.required ?? []).toEqual(
			expect.arrayContaining(["fromModel", "reason", "threadId", "toModel", "turnId"]),
		);
		expect(enumOf("ModelRerouteReason")).toContain("highRiskCyberActivity");
	});

	it("nothing the pin sends names the model a spawned thread runs on", () => {
		expect(bundle.definitions.Thread?.properties ?? {}).not.toHaveProperty("model");
		const spawn = (bundle.definitions.SubAgentSource?.oneOf ?? []).find((variant) => variant.title === "ThreadSpawnSubAgentSource");
		expect(JSON.stringify(spawn)).not.toContain("model");
		expect(JSON.stringify(bundle.definitions.ThreadStatus)).not.toContain("model");
	});
});
