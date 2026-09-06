import { Effect } from "effect";
import { admissible } from "#send/admission/admissible.ts";
import { SessionInputBackendTextOnly } from "#send/errors.ts";
import { SessionSendOptions } from "#send/options.ts";

export const admitDraft = Effect.fn("SessionSend.admitDraft")(function* (backend: string, parts: ReadonlyArray<{ readonly type: "image" | "text" }>) {
	const { imageInputBackends } = yield* SessionSendOptions;
	if (!admissible(imageInputBackends, backend, parts)) return yield* new SessionInputBackendTextOnly({ backend });
});
