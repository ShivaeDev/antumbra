import { expect, it } from "@effect/vitest";
import { Option } from "effect";
import { dispatchFailureAccount } from "#dispatch-failure-account.ts";

it("carries a recorded reason word for word, beside its tag and status", () => {
	expect(
		dispatchFailureAccount(
			Option.some({
				detail: "RunnerFailure: the berth is dirty",
				status: "failed",
				tag: "agent/spawn",
			}),
		),
	).toEqual({
		detail: "RunnerFailure: the berth is dirty",
		status: "failed",
		tag: "agent/spawn",
	});
});

it("says so plainly when the Intent recorded no reason at all", () => {
	expect(dispatchFailureAccount(Option.some({ detail: null, status: "failed", tag: "agent/spawn" }))).toEqual({
		detail: "the Intent recorded no reason",
		status: "failed",
		tag: "agent/spawn",
	});
});

it("names a missing Intent as gone rather than as an empty container", () => {
	expect(dispatchFailureAccount(Option.none())).toEqual({
		detail: "the Intent row is gone",
		status: "missing",
		tag: "missing",
	});
});
