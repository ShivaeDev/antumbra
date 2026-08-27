import { Result } from "effect";
import { describe, expect, it } from "vitest";
import {
	INTENT_EVENTS,
	INTENT_STATUSES,
	type IntentEvent,
	type IntentStatus,
	isTerminalIntentStatus,
	transition,
} from "#fsm.ts";

const LEGAL: Record<
	IntentStatus,
	Partial<Record<IntentEvent, IntentStatus>>
> = {
	cancelled: {},
	cancelling: {
		fail: "failed",
		interrupt: "cancelled",
		succeed: "succeeded",
		wait: "cancelled",
	},
	failed: {},
	queued: { admit: "running", cancel: "cancelled" },
	running: {
		abandon: "failed",
		cancel: "cancelling",
		fail: "failed",
		requeue: "queued",
		succeed: "succeeded",
		wait: "waiting",
	},
	succeeded: {},
	waiting: { cancel: "cancelled", retry: "queued" },
};

describe("intent FSM", () => {
	for (const from of INTENT_STATUSES) {
		for (const event of INTENT_EVENTS) {
			const expected = LEGAL[from][event];
			if (expected === undefined) {
				it(`rejects ${event} from ${from}`, () => {
					expect(Result.isFailure(transition(from, event))).toBe(true);
				});
			} else {
				it(`moves ${from} to ${expected} on ${event}`, () => {
					expect(transition(from, event)).toEqual(Result.succeed(expected));
				});
			}
		}
	}

	it("names the offending event and status in the rejection", () => {
		const result = transition("queued", "succeed");
		expect(Result.isFailure(result)).toBe(true);
		if (Result.isFailure(result)) {
			expect(result.failure._tag).toBe("InvalidTransition");
			expect(result.failure.event).toBe("succeed");
			expect(result.failure.from).toBe("queued");
		}
	});

	it("classifies exactly the absorbing statuses as terminal", () => {
		for (const status of INTENT_STATUSES) {
			const isAbsorbing = INTENT_EVENTS.every((event) =>
				Result.isFailure(transition(status, event)),
			);
			expect(isTerminalIntentStatus(status)).toBe(isAbsorbing);
		}
	});
});
