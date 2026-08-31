import { decodeStoredSubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("reads null as a Session that has not ended", () => {
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
