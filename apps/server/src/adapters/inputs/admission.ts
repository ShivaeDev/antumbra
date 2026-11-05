import { InputRefused } from "@antumbra/domain-inputs/commands/errors.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { Draft } from "@antumbra/platform-vocabulary/inputs.ts";
import { Inputs } from "@antumbra/server-inputs/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect } from "effect";

export const target = Effect.fn("inputs.target")(function* (sessionId: string, inputId: string) {
	const sessionsService = yield* Sessions;

	const root = yield* sessionsService.reading({ id: SessionId.make(sessionId) }).pipe(Effect.orDie);
	if (root === null || root.status !== "open" || root.parentSessionId !== null)
		return yield* new InputRefused({ inputId, detail: "An open root session is required" });
	return root;
});

export const admit = Effect.fn("inputs.admit")(function* (draft: Draft) {
	const inputsService = yield* Inputs;

	const root = yield* target(draft.sessionId, draft.id);
	if (!draft.parts.some((part) => part.type === "image")) return;
	const capability = yield* inputsService.support({ sessionId: draft.sessionId }).pipe(Effect.orDie);
	if (!capability.imageInput)
		return yield* new InputRefused({ inputId: draft.id, detail: `backend_text_only: ${root.backend} has no proven image-input capability` });
});
