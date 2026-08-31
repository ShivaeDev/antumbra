import { admiralWords, wakeWords } from "@antumbra/prompts";
import type { makeSessionSend } from "@antumbra/sessions";
import { expect, it } from "@effect/vitest";
import type { Effect } from "effect";

type SessionSend = Effect.Success<ReturnType<typeof makeSessionSend>>["sendPrompt"];
type Words = Parameters<SessionSend>[1];

const fromCatalog: Words = admiralWords({ words: "come about" });
const standing: Words = wakeWords;
// @ts-expect-error prose the catalog never wrote is not something an Agent may hear.
const assembledHere: Words = "come about";

it("the send seam takes catalog words and refuses prose assembled elsewhere", () => {
	expect(fromCatalog).toBe("come about");
	expect(assembledHere).toBe("come about");
	expect(standing).toBe("Reconcile durable Antumbra truth and continue your assigned work.");
});
