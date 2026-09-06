import { SessionInputNotFound, SessionInputs } from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import { admiralInput } from "#input.ts";

export const load = Effect.fn("SessionInputDelivery.load")(function* (sessionId: string, inputId: SessionInputId) {
	const inputs = yield* SessionInputs;
	const stored = yield* inputs.load(inputId);
	if (stored.sessionId !== sessionId) return yield* new SessionInputNotFound({ inputId });
	return admiralInput(stored.input);
});
