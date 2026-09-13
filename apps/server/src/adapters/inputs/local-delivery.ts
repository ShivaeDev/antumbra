import { delivery } from "@antumbra/domain-inputs/commands/delivery.ts";
import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import type { Draft } from "@antumbra/domain-inputs/rows/content.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Layer } from "effect";
import { admit } from "#adapters/inputs/admission.ts";

export const localInputDelivery = Layer.effect(
	InputDelivery,
	Effect.gen(function* () {
		const commit = yield* Commit;
		const live = yield* Live;
		return {
			admit: (draft: Draft) => admit(draft).pipe(Effect.provideService(Live, live)),
			deliver: Effect.fn("inputs.queueLocally")(function* (input: { readonly sessionId: string; readonly inputId: string }) {
				const id = SessionInputId.make(input.inputId);
				yield* commit
					.commit(delivery, {
						requestId: Request.make(`input-queued:${id}`),
						id,
						status: "queued_for_wake",
						detail: "Execution is unavailable in this fixture. Input is recorded locally.",
					})
					.pipe(
						Effect.catchTag("AlreadyDone", () => Effect.void),
						Effect.catchTag("DeliverySettled", () => Effect.void),
					);
				return "queued_for_wake" as const;
			}),
		};
	}),
);
