import { InputRefused } from "@antumbra/domain-inputs/commands/errors.ts";
import { support } from "@antumbra/domain-inputs/queries/support.ts";
import type { Draft } from "@antumbra/domain-inputs/rows/content.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";

export const target = Effect.fn("inputs.target")(function* (sessionId: string, inputId: string) {
	const root = yield* (yield* Live).read(reading, { id: SessionId.make(sessionId) });
	if (root === null || root.status !== "open" || root.parentSessionId !== null)
		return yield* new InputRefused({ inputId, detail: "An open root session is required" });
	return root;
});

export const admit = Effect.fn("inputs.admit")(function* (draft: Draft) {
	const root = yield* target(draft.sessionId, draft.id);
	if (!draft.parts.some((part) => part.type === "image")) return;
	const capability = yield* (yield* Live).read(support, { sessionId: draft.sessionId });
	if (!capability.imageInput)
		return yield* new InputRefused({ inputId: draft.id, detail: `backend_text_only: ${root.backend} has no proven image-input capability` });
});
