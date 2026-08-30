import type { SessionInput } from "@antumbra/plugin-api";
import { type SessionInputDeliveryStatus, SessionInputs } from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import { SessionInputBackendTextOnly, SessionInputRetryAmbiguous, type SessionSendReceipt } from "#send/errors.ts";

// why: the rule reads nothing but the kinds of part in front of it, so one
// sentence answers about the draft the admiral has just handed over and about
// the input already in custody.
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
		// why: asked of the draft before any of it is decoded, normalized or
		// written down, so a backend that cannot receive images costs the admiral
		// one sentence rather than a directory of bytes nothing will ever send.
		const admitDraft = (backend: string, parts: ReadonlyArray<{ readonly type: "image" | "text" }>) =>
			admissible(backend, parts) ? Effect.void : Effect.fail(new SessionInputBackendTextOnly({ backend }));
		// why: asked again of the stored input, because custody outlives the send
		// that created it — anything arriving here has a durable row, and the
		// refusal belongs on that row where the next reader of it will look.
		const admit = (backend: string, inputId: SessionInputId, input: SessionInput) => {
			if (admissible(backend, input.parts)) {
				return Effect.void;
			}
			return inputs.mark(inputId, "refused").pipe(Effect.andThen(Effect.fail(new SessionInputBackendTextOnly({ backend }))));
		};
		return { admit, admitDraft, replayed };
	});
