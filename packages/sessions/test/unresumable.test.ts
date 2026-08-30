import { expect, it } from "@effect/vitest";
import { type SessionUnresumable, unresumableDetail, unresumableVerdict } from "#unresumable.ts";

// why: waiting promises the blocker can clear. A drain settles on the next
// pass and an Agent's pointer moves, so both are worth parking for; a Session
// or an Agent that is not on the fleet never arrives, and parking on it would
// hold the wake open against a state nothing can change.
it("waits only where the state still has a way out", () => {
	expect(unresumableVerdict({ _tag: "draining" })).toBe("wait");
	expect(unresumableVerdict({ _tag: "not-current", currentSessionId: "session-b" })).toBe("wait");
	expect(unresumableVerdict({ _tag: "no-root" })).toBe("refuse");
	expect(unresumableVerdict({ _tag: "no-agent", agentId: "agent-a" })).toBe("refuse");
	// why: a closed Session reads like a wait and is not one. Nothing reopens it,
	// so parking a wake there holds the admiral's words for ever.
	expect(unresumableVerdict({ _tag: "session-closed" })).toBe("refuse");
});

// why: the Agent lifecycle table decides this, not a list kept here — spawning
// still has a move to alive, and dormant and retired do not.
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

it("says which truth it met, naming the Session and what stood in the way", () => {
	const reasons: ReadonlyArray<SessionUnresumable> = [
		{ _tag: "agent-not-alive", agentId: "agent-a", status: "retired" },
		{ _tag: "draining" },
		{ _tag: "no-agent", agentId: "agent-a" },
		{ _tag: "no-root" },
		{ _tag: "not-current", currentSessionId: "session-b" },
		{ _tag: "not-current", currentSessionId: null },
		{ _tag: "session-closed" },
	];
	for (const reason of reasons) {
		expect(unresumableDetail("session-a", reason).length).toBeGreaterThan(0);
	}
	expect(
		unresumableDetail("session-a", {
			_tag: "agent-not-alive",
			agentId: "agent-a",
			status: "retired",
		}),
	).toContain("retired");
	expect(
		unresumableDetail("session-a", {
			_tag: "not-current",
			currentSessionId: "session-b",
		}),
	).toContain("session-b");
	expect(unresumableDetail("session-a", { _tag: "draining" })).toContain("session-a");
	expect(unresumableDetail("session-a", { _tag: "session-closed" })).toContain("has closed");
});
