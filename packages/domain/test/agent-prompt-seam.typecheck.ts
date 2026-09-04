import { admiralWords, wakeWords } from "@antumbra/prompts";
import type { makeSessionSend } from "@antumbra/sessions";
import type { Effect } from "effect";

type SessionSend = Effect.Success<ReturnType<typeof makeSessionSend>>["sendPrompt"];
type Words = Parameters<SessionSend>[1];

const acceptsPrompt = (_prompt: Words): void => {};

acceptsPrompt(admiralWords({ words: "Review the proposed fix." }));
acceptsPrompt(wakeWords);
// @ts-expect-error The send seam requires a catalog-authored prompt.
acceptsPrompt("Review the proposed fix.");
