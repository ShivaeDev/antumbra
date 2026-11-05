import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { InputAmbiguous, InputNotFound, InputRefused } from "@antumbra/domain-inputs/commands/errors.ts";
import { deliveryReading } from "@antumbra/domain-inputs/queries/delivery.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Draft } from "@antumbra/platform-vocabulary/inputs.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Capacity } from "@antumbra/server-capacity/service.ts";
import { unexpectedDelivery } from "@antumbra/server-inputs/failures.ts";
import { Inputs } from "@antumbra/server-inputs/service.ts";
import type { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect, Layer, Option, Stream } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import { stream } from "effect/reactivity/Reactivity";
import { admit, target } from "#adapters/inputs/admission.ts";
import { keysOf } from "#keys.ts";

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
		const runners = yield* RunnerOperations;
		const context = yield* Effect.context<Effect.Services<typeof Inputs | typeof Capacity | typeof Sessions> | Reactivity>();
		const deliver = Effect.fn("inputs.deliver")(function* (input: { readonly sessionId: string; readonly inputId: string }) {
			const capacityService = yield* Capacity;
			const inputsService = yield* Inputs;

			const root = yield* target(input.sessionId, input.inputId).pipe(Effect.provideContext(context));
			const inputId = SessionInputId.make(input.inputId);
			const registrations = yield* runners.connected;
			const capacities = yield* capacityService.providers({}).pipe(Effect.orDie);
			const queued =
				!root.attached ||
				!registrations.some((runner) => runner.runnerId === root.runnerId) ||
				capacities.some((capacity) => capacity.backend === root.backend && capacity.status === "blocked");
			if (queued) {
				yield* inputsService
					.delivery({ requestId: Request.make(`input-queued:${inputId}`), id: inputId, status: "queued_for_wake", detail: null })
					.pipe(
						Effect.catchIf(unexpectedDelivery, Effect.die),
						Effect.catchTag("AlreadyDone", () => Effect.void),
						Effect.catchTag("DeliverySettled", () => Effect.void),
					);
			}
			const settled = yield* stream(keysOf(deliveryReading.reads, deliveryReading.scope?.({ inputId })))(
				inputsService.deliveryReading({ inputId }).pipe(Effect.orDie),
			).pipe(
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
		return {
			admit: (draft: Draft) => admit(draft).pipe(Effect.provideContext(context)),
			deliver: (input: { readonly sessionId: string; readonly inputId: string }) => deliver(input).pipe(Effect.provideContext(context)),
		};
	}),
);
