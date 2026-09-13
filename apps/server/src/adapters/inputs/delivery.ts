import { providers } from "@antumbra/domain-capacity/queries/providers.ts";
import { delivery } from "@antumbra/domain-inputs/commands/delivery.ts";
import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { InputAmbiguous, InputNotFound, InputRefused } from "@antumbra/domain-inputs/commands/errors.ts";
import { deliveryReading } from "@antumbra/domain-inputs/queries/delivery.ts";
import type { Draft } from "@antumbra/domain-inputs/rows/content.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Layer, Option, Stream } from "effect";
import { admit, target } from "#adapters/inputs/admission.ts";

const receiptOf = Effect.fn("inputs.receipt")(function* (inputId: SessionInputId, settled: typeof deliveryReading.output.Type, queued: boolean) {
	if (settled.input === null) return yield* new InputNotFound({ inputId });
	if (settled.input.status === "ambiguous") return yield* new InputAmbiguous({ inputId });
	if (settled.input.status === "accepted") return "accepted" as const;
	if (settled.input.status === "refused")
		return yield* new InputRefused({ inputId, detail: settled.input.detail ?? "The provider refused this input" });
	if (queued) return "queued_for_wake" as const;
	return yield* new InputRefused({ inputId, detail: settled.operation?.detail ?? "The session operation is waiting" });
});

export const inputDeliveryLayer = Layer.effect(InputDelivery)(
	Effect.gen(function* () {
		const live = yield* Live;
		const commit = yield* Commit;
		const runners = yield* RunnerOperations;
		const deliver = Effect.fn("inputs.deliver")(function* (input: { readonly sessionId: string; readonly inputId: string }) {
			const root = yield* target(input.sessionId, input.inputId).pipe(Effect.provideService(Live, live));
			const inputId = SessionInputId.make(input.inputId);
			const registrations = yield* runners.connected;
			const capacities = yield* live.read(providers, {});
			const queued =
				!root.attached ||
				!registrations.some((runner) => runner.runnerId === root.runnerId) ||
				capacities.some((capacity) => capacity.backend === root.backend && capacity.status === "blocked");
			if (queued) {
				yield* commit
					.commit(delivery, { requestId: Request.make(`input-queued:${inputId}`), id: inputId, status: "queued_for_wake", detail: null })
					.pipe(
						Effect.catchTag("AlreadyDone", () => Effect.void),
						Effect.catchTag("DeliverySettled", () => Effect.void),
					);
			}
			const settled = yield* live.live(deliveryReading, { inputId }).pipe(
				Stream.filter(
					(value) =>
						queued ||
						value.input?.status === "accepted" ||
						value.input?.status === "ambiguous" ||
						value.input?.status === "refused" ||
						value.operation?.status === "waiting" ||
						value.operation?.status === "cancelled",
				),
				Stream.runHead,
				Effect.map(Option.getOrThrow),
			);
			return yield* receiptOf(inputId, settled, queued);
		});
		return { admit: (draft: Draft) => admit(draft).pipe(Effect.provideService(Live, live)), deliver };
	}),
);
