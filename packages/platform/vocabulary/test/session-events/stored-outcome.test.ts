import { decodeStoredSubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("reads null as a Session that has not ended", () => {
	expect(decodeStoredSubsessionOutcome("session-1", null)).toEqual(Result.succeed(null));
});
