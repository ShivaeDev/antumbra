import { decodeStoredSubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("reads back every ending it owns, and the null of one that has not ended", () => {
	expect(decodeStoredSubsessionOutcome("session-1", "completed")).toEqual(Result.succeed("completed"));
	expect(decodeStoredSubsessionOutcome("session-1", "failed")).toEqual(Result.succeed("failed"));
	expect(decodeStoredSubsessionOutcome("session-1", "interrupted")).toEqual(Result.succeed("interrupted"));
	expect(decodeStoredSubsessionOutcome("session-1", "unknown")).toEqual(Result.succeed("unknown"));
	expect(decodeStoredSubsessionOutcome("session-1", null)).toEqual(Result.succeed(null));
});

it("retains the subject and the unknown stored word in a typed failure", () => {
	expect(decodeStoredSubsessionOutcome("session-1", "killed")).toMatchObject({
		failure: {
			_tag: "StoredSubsessionOutcomeInvalid",
			sessionId: "session-1",
			value: "killed",
		},
	});
});
