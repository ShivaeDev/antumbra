import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { isTerminalIntentStatus, transition } from "#fsm.ts";

describe("intent FSM", () => {
	it("carries an intent from admission through to success", () => {
		expect(transition("queued", "admit")).toEqual(Result.succeed("running"));
		expect(transition("running", "wait")).toEqual(Result.succeed("waiting"));
		expect(transition("waiting", "retry")).toEqual(Result.succeed("queued"));
		expect(transition("running", "succeed")).toEqual(Result.succeed("succeeded"));
	});

	it("routes cancellation of running work through cancelling", () => {
		expect(transition("running", "cancel")).toEqual(Result.succeed("cancelling"));
		expect(transition("cancelling", "wait")).toEqual(Result.succeed("cancelled"));
	});

	it("names the offending event and status in the rejection", () => {
		const result = transition("queued", "succeed");
		expect(Result.isFailure(result)).toBe(true);
		if (Result.isFailure(result)) {
			expect(result.failure._tag).toBe("InvalidTransition");
			expect(result.failure.event).toBe("succeed");
			expect(result.failure.from).toBe("queued");
		}
	});

	it("distinguishes work in progress from work that ended", () => {
		expect(isTerminalIntentStatus("running")).toBe(false);
		expect(isTerminalIntentStatus("succeeded")).toBe(true);
	});
});
