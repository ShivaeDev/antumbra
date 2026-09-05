import { it } from "@antumbra/testing-runtime/domain";
import { expect } from "@effect/vitest";

for (const run of [1, 2]) {
	it.effectApp(`isolates domain records for test ${run}`, function* ({ db }) {
		expect(yield* db.Agent.where({ id: "test-isolation-agent" }).exists()).toBe(false);
		yield* db.Agent.create({
			charter: "verify isolated test records",
			id: "test-isolation-agent",
			role: "hand",
			status: "alive",
		});
		expect(yield* db.Agent.where({ id: "test-isolation-agent" }).exists()).toBe(true);
	});
}
