import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Draft } from "@antumbra/platform-vocabulary/inputs.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { unexpectedDelivery } from "@antumbra/server-inputs/failures.ts";
import { Inputs } from "@antumbra/server-inputs/service.ts";
import { Effect, Layer } from "effect";
import { admit } from "#adapters/inputs/admission.ts";

export const localInputDelivery = Layer.effect(
	InputDelivery,
	Effect.gen(function* () {
		const context = yield* Effect.context<Effect.Services<ReturnType<typeof admit>>>();
		const inputsService = yield* Inputs;

		return {
			admit: (draft: Draft) => admit(draft).pipe(Effect.provideContext(context)),
			deliver: Effect.fn("inputs.queueLocally")(function* (input: { readonly sessionId: string; readonly inputId: string }) {
				const id = SessionInputId.make(input.inputId);
				yield* inputsService
					.delivery({
						requestId: Request.make(`input-queued:${id}`),
						id,
						status: "queued_for_wake",
						detail: "Execution is unavailable in this fixture. Input is recorded locally.",
					})
					.pipe(
						Effect.catchIf(unexpectedDelivery, Effect.die),
						Effect.catchTag("AlreadyDone", () => Effect.void),
						Effect.catchTag("DeliverySettled", () => Effect.void),
					);
				return "queued_for_wake" as const;
			}),
		};
	}),
);
