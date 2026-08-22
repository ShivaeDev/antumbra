import { admiralWords, standingRecovery } from "@antumbra/prompts";
import { expect, it } from "@effect/vitest";
import type { Effect } from "effect";
import type { makeSessionSend } from "#session-send.ts";

type SessionSend = Effect.Success<typeof makeSessionSend>;
type Words = Parameters<SessionSend>[1];

// why: this declaration is the regression proof. The send seam is the last
// place before a provider takes the words, and it accepts only what the
// catalog minted. If a bare string ever satisfies it again, the pragma below
// becomes unused and the build fails.
const fromCatalog: Words = admiralWords({ words: "come about" });
const standing: Words = standingRecovery;
// @ts-expect-error prose the catalog never wrote is not something an Agent may hear.
const assembledHere: Words = "come about";

it("the send seam takes catalog words and refuses prose assembled elsewhere", () => {
	expect(fromCatalog).toBe("come about");
	expect(assembledHere).toBe("come about");
	expect(standing).toBe(
		"Reconcile durable Antumbra truth and continue your assigned work.",
	);
});
