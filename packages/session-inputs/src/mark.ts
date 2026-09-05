import { Database } from "@antumbra/persistence";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import type { SessionInputDeliveryStatus } from "#model.ts";

export const mark = Effect.fn("SessionInputs.mark")(function* (inputId: SessionInputId, status: SessionInputDeliveryStatus) {
	const db = yield* Database;
	yield* db.SessionInput.where({ id: inputId }).update({ deliveryStatus: status });
});
