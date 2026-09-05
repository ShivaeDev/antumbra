import { decodeSessionExecutionStatus, sessionExecutionTransition, sessionPresence } from "@antumbra/vocabulary/agent-runtime";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("keeps Session execution status closed and transitions explicit", () => {
	expect(Result.isFailure(decodeSessionExecutionStatus("session-1", "paused"))).toBe(true);
	expect(Result.isFailure(sessionExecutionTransition("session-1", "active", "settle"))).toBe(true);
});

it("separates resting at a turn boundary from draining toward siesta", () => {
	expect(sessionExecutionTransition("session-1", "active", "request-siesta")).toEqual(Result.succeed("draining"));
	expect(sessionExecutionTransition("session-1", "idle", "wake")).toEqual(Result.succeed("active"));
});

it("rests only a session that was taking a turn", () => {
	expect(sessionExecutionTransition("session-1", "active", "turn-completed")).toEqual(Result.succeed("idle"));
	expect(Result.isFailure(sessionExecutionTransition("session-1", "idle", "turn-completed"))).toBe(true);
	expect(Result.isFailure(sessionExecutionTransition("session-1", "draining", "turn-completed"))).toBe(true);
});

it("tells listening from asleep by the attachment, not the row", () => {
	const open = { executionStatus: "idle", open: true } as const;
	expect(sessionPresence({ ...open, attached: true })).toBe("idle");
	expect(sessionPresence({ ...open, attached: false })).toBe("asleep");
	expect(sessionPresence({ attached: true, executionStatus: "active", open: true })).toBe("working");
	expect(sessionPresence({ attached: true, executionStatus: "active", open: false })).toBe("ended");
});

it("tells stranded from asleep by what the row still claims", () => {
	expect(sessionPresence({ attached: false, executionStatus: "active", open: true })).toBe("stranded");
	expect(sessionPresence({ attached: false, executionStatus: "idle", open: true })).toBe("asleep");
	expect(
		sessionPresence({
			attached: false,
			executionStatus: "draining",
			open: true,
		}),
	).toBe("asleep");
	expect(
		sessionPresence({
			attached: false,
			executionStatus: "active",
			open: false,
		}),
	).toBe("ended");
});
