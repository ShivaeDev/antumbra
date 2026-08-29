import {
	decodeSessionExecutionStatus,
	SessionExecutionStatusSchema,
	sessionExecutionTransition,
	sessionPresence,
} from "@antumbra/vocabulary/agent-runtime";
import { expect, it } from "@effect/vitest";
import { Option, Result, Schema } from "effect";

it("keeps Session execution status closed and transitions explicit", () => {
	const decode = Schema.decodeUnknownOption(SessionExecutionStatusSchema);
	expect(
		["active", "draining", "idle"]
			.map((value) => decode(value))
			.every(Option.isSome),
	).toBe(true);
	expect(Option.isNone(decode("paused"))).toBe(true);
	expect(
		Result.isFailure(decodeSessionExecutionStatus("session-1", "paused")),
	).toBe(true);
	expect(
		Result.isFailure(
			sessionExecutionTransition("session-1", "active", "settle"),
		),
	).toBe(true);
});

// why: the two ways a Session stops executing are different facts, and the
// table is where that difference is made unrepresentable rather than argued
// about at a call site. Standing down reaches idle in one move because nothing
// is torn down; draining is the move that ends an attachment.
it("separates standing down from draining toward siesta", () => {
	expect(
		sessionExecutionTransition("session-1", "active", "stand-down"),
	).toEqual(Result.succeed("idle"));
	expect(
		sessionExecutionTransition("session-1", "active", "request-siesta"),
	).toEqual(Result.succeed("draining"));
	// why: an Agent may say it has nothing left to do; it may not say it twice,
	// and it may never ask to have its process taken away.
	expect(
		Result.isFailure(
			sessionExecutionTransition("session-1", "idle", "stand-down"),
		),
	).toBe(true);
	expect(sessionExecutionTransition("session-1", "idle", "wake")).toEqual(
		Result.succeed("active"),
	);
});

// why: a turn ending is the other way to stop executing, and it is named in the
// table rather than borrowing the declaration's name — a log that could not
// tell the two apart would have the Agent declaring things it never said. It is
// guarded the same way: an ending only settles a Session that was running.
it("separates a completed turn from the declaration that stands down", () => {
	expect(
		sessionExecutionTransition("session-1", "active", "turn-completed"),
	).toEqual(Result.succeed("idle"));
	expect(
		Result.isFailure(
			sessionExecutionTransition("session-1", "idle", "turn-completed"),
		),
	).toBe(true);
	expect(
		Result.isFailure(
			sessionExecutionTransition("session-1", "draining", "turn-completed"),
		),
	).toBe(true);
});

// why: a presence is read from the record and this process together, so the
// same row means different things depending on whether anything is listening.
it("tells listening from asleep by the attachment, not the row", () => {
	const open = { executionStatus: "idle", open: true } as const;
	expect(sessionPresence({ ...open, attached: true })).toBe("idle");
	expect(sessionPresence({ ...open, attached: false })).toBe("asleep");
	expect(
		sessionPresence({ attached: true, executionStatus: "active", open: true }),
	).toBe("working");
	expect(
		sessionPresence({ attached: true, executionStatus: "active", open: false }),
	).toBe("ended");
});

// why: the two quiet readings a missing attachment can have, and the whole
// reason they are separate words. One was rested on purpose and owes nothing;
// the other has a row still claiming a turn that no process is taking, so its
// work never finished and only a hail picks it back up.
it("tells stranded from asleep by what the row still claims", () => {
	expect(
		sessionPresence({ attached: false, executionStatus: "active", open: true }),
	).toBe("stranded");
	expect(
		sessionPresence({ attached: false, executionStatus: "idle", open: true }),
	).toBe("asleep");
	expect(
		sessionPresence({
			attached: false,
			executionStatus: "draining",
			open: true,
		}),
	).toBe("asleep");
	// why: a closed Session is over however its execution column reads.
	expect(
		sessionPresence({
			attached: false,
			executionStatus: "active",
			open: false,
		}),
	).toBe("ended");
});
