import { expect, it } from "@effect/vitest";
import { Option, Result, Schema } from "effect";
import {
	decodeSessionExecutionStatus,
	SessionExecutionStatusSchema,
	sessionExecutionTransition,
} from "#session-execution-status.ts";

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
