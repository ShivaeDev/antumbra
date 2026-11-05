import { InputRefused } from "@antumbra/domain-inputs/commands/errors.ts";
import type { Draft } from "@antumbra/platform-vocabulary/inputs.ts";
import { SessionId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Effect, Option } from "effect";
import { support } from "#queries/support.ts";

export const admit = Effect.fn("Inputs.admit")(function* (draft: Draft) {
	const root = yield* (yield* (yield* InputsHistory).rows()).session
		.findOne({ where: { id: SessionId.make(draft.sessionId) }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(root) || root.value.status !== "open" || root.value.parentSessionId !== null)
		return yield* new InputRefused({ inputId: draft.id, detail: "An open root session is required" });
	if (!draft.parts.some((part) => part.type === "image")) return;
	if (!(yield* support({ sessionId: draft.sessionId })).imageInput)
		return yield* new InputRefused({ inputId: draft.id, detail: `backend_text_only: ${root.value.backend} has no proven image-input capability` });
});
