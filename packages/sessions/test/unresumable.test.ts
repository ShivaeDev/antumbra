import { expect, it } from "@effect/vitest";
import { unresumableVerdict } from "#unresumable.ts";

it("waits only where the state still has a way out", () => {
	expect(unresumableVerdict({ _tag: "draining" })).toBe("wait");
	expect(unresumableVerdict({ _tag: "not-current", currentSessionId: "session-b" })).toBe("wait");
	expect(unresumableVerdict({ _tag: "no-root" })).toBe("refuse");
	expect(unresumableVerdict({ _tag: "no-agent", agentId: "agent-a" })).toBe("refuse");
	expect(unresumableVerdict({ _tag: "session-closed" })).toBe("refuse");
});

it("waits for an Agent still being born and refuses one with no way back", () => {
	expect(
		unresumableVerdict({
			_tag: "agent-not-alive",
			agentId: "agent-a",
			status: "spawning",
		}),
	).toBe("wait");
	for (const status of ["dormant", "retired"] as const) {
		expect(
			unresumableVerdict({
				_tag: "agent-not-alive",
				agentId: "agent-a",
				status,
			}),
		).toBe("refuse");
	}
});
