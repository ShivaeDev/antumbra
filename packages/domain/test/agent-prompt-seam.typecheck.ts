import { admiralWords } from "@antumbra/prompts/admiral.ts";
import { wakeWords } from "@antumbra/prompts/wake.ts";
import type { SessionSend } from "@antumbra/sessions/send/service";
import type { Effect } from "effect";

type Words = Parameters<Effect.Success<typeof SessionSend>["sendPrompt"]>[1];

const acceptsPrompt = (_prompt: Words): void => {};

acceptsPrompt(admiralWords({ words: "Review the proposed fix." }));
acceptsPrompt(wakeWords);
// @ts-expect-error The send seam requires a catalog-authored prompt.
acceptsPrompt("Review the proposed fix.");
