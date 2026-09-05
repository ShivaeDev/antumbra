import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { digestRequest } from "#digest.ts";
import type { SessionInputDraft } from "#model.ts";
import { prepareInput } from "#prepare.ts";
import { deliveryStatus, requireSameRequest } from "#stored.ts";
import { storePreparedInput } from "#write.ts";

export const ingest = Effect.fn("SessionInputs.ingest")(function* (draft: SessionInputDraft) {
	const db = yield* Database;
	const existing = yield* db.SessionInput.where({ id: draft.id }).first();
	if (Option.isSome(existing)) {
		yield* requireSameRequest(draft.id, digestRequest(draft.sessionId, draft.parts), existing.value.requestDigest);
		const status = yield* Effect.fromResult(deliveryStatus(draft.id, existing.value.deliveryStatus));
		return { id: draft.id, status };
	}
	const prepared = yield* prepareInput(draft);
	return yield* storePreparedInput(prepared);
});
