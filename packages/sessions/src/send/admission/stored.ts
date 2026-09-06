import type { SessionInput } from "@antumbra/plugin-api";
import { SessionInputs } from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input.ts";
import { Effect } from "effect";
import { admissible } from "#send/admission/admissible.ts";
import { SessionInputBackendTextOnly } from "#send/errors.ts";
import { SessionSendOptions } from "#send/options.ts";

export const admitStored = Effect.fn("SessionSend.admitStored")(function* (backend: string, inputId: SessionInputId, input: SessionInput) {
	const { imageInputBackends } = yield* SessionSendOptions;
	if (admissible(imageInputBackends, backend, input.parts)) return;
	const inputs = yield* SessionInputs;
	yield* inputs.mark(inputId, "refused");
	return yield* new SessionInputBackendTextOnly({ backend });
});
