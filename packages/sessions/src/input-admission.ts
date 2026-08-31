import type { SessionInput } from "@antumbra/plugin-api";
import { type SessionInputDeliveryStatus, SessionInputs } from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import { SessionInputBackendTextOnly, SessionInputRetryAmbiguous, type SessionSendReceipt } from "#send/errors.ts";

const bearsImages = (parts: ReadonlyArray<{ readonly type: "image" | "text" }>): boolean => parts.some((part) => part.type === "image");

export const makeSessionInputAdmission = (imageInputBackends: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const inputs = yield* SessionInputs;
		const replayed = (
			status: SessionInputDeliveryStatus,
			inputId: SessionInputId,
		): Effect.Effect<SessionSendReceipt | undefined, SessionInputRetryAmbiguous> => {
			switch (status) {
				case "accepted":
					return Effect.succeed("accepted");
				case "queued_for_wake":
					return Effect.succeed("queued_for_wake");
				case "ambiguous":
					return Effect.fail(new SessionInputRetryAmbiguous({ inputId }));
				default:
					return Effect.succeed(undefined);
			}
		};
		const admissible = (backend: string, parts: ReadonlyArray<{ readonly type: "image" | "text" }>) =>
			!bearsImages(parts) || imageInputBackends.has(backend);
		const admitDraft = (backend: string, parts: ReadonlyArray<{ readonly type: "image" | "text" }>) =>
			admissible(backend, parts) ? Effect.void : Effect.fail(new SessionInputBackendTextOnly({ backend }));
		const admit = (backend: string, inputId: SessionInputId, input: SessionInput) => {
			if (admissible(backend, input.parts)) {
				return Effect.void;
			}
			return inputs.mark(inputId, "refused").pipe(Effect.andThen(Effect.fail(new SessionInputBackendTextOnly({ backend }))));
		};
		return { admit, admitDraft, replayed };
	});
