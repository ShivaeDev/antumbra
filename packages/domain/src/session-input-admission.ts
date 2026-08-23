import type { SessionInput } from "@antumbra/plugin-api";
import {
	type SessionInputDeliveryStatus,
	SessionInputs,
} from "@antumbra/session-inputs";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import {
	SessionInputBackendTextOnly,
	SessionInputRetryAmbiguous,
	type SessionSendReceipt,
} from "#session-send-errors.ts";

export const makeSessionInputAdmission = (
	imageInputBackends: ReadonlySet<string>,
) =>
	Effect.gen(function* () {
		const inputs = yield* SessionInputs;
		const replayed = (
			status: SessionInputDeliveryStatus,
			inputId: SessionInputId,
		): Effect.Effect<
			SessionSendReceipt | undefined,
			SessionInputRetryAmbiguous
		> => {
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
		const admit = (
			backend: string,
			inputId: SessionInputId,
			input: SessionInput,
		) => {
			const hasImages = input.parts.some((part) => part.type === "image");
			if (!hasImages || imageInputBackends.has(backend)) {
				return Effect.void;
			}
			return inputs
				.mark(inputId, "refused")
				.pipe(
					Effect.andThen(
						Effect.fail(new SessionInputBackendTextOnly({ backend })),
					),
				);
		};
		return { admit, replayed };
	});
