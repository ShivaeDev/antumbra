import type { SessionInputDeliveryStatus } from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input.ts";
import { Effect } from "effect";
import { SessionInputRetryAmbiguous } from "#send/errors.ts";

export const replayed = Effect.fn("SessionSend.replayed")(function* (status: SessionInputDeliveryStatus, inputId: SessionInputId) {
	switch (status) {
		case "accepted":
			return "accepted" as const;
		case "queued_for_wake":
			return "queued_for_wake" as const;
		case "ambiguous":
			return yield* Effect.fail(new SessionInputRetryAmbiguous({ inputId }));
		default:
			return undefined;
	}
});
