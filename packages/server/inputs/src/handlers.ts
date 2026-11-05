import { DeliveryReading, InputsContract, Pending, Reading, Support } from "@antumbra/server-inputs/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { unexpectedDelivery, unexpectedRecord, unexpectedRetry, unexpectedSubmit } from "#failures.ts";
import { Inputs } from "#service.ts";
import { submit } from "#submit.ts";
export const handlers = InputsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Inputs;
		return InputsContract.application.of({
			"inputs.submit": (input) => submit(input).pipe(Effect.catchIf(unexpectedSubmit, Effect.die)),
			"inputs.image": (input) => service.image(input),
			"inputs.record": (input) => service.record(input).pipe(Effect.catchIf(unexpectedRecord, Effect.die)),
			"inputs.delivery": (input) => service.delivery(input).pipe(Effect.catchIf(unexpectedDelivery, Effect.die)),
			"inputs.retry": (input) => service.retry(input).pipe(Effect.catchIf(unexpectedRetry, Effect.die)),
			"inputs.reading": (input) => stream(readKeys(Reading.reads(input)))(service.reading(input).pipe(Effect.orDie)),
			"inputs.pending": (input) => stream(readKeys(Pending.reads(input)))(service.pending(input).pipe(Effect.orDie)),
			"inputs.deliveryReading": (input) => stream(readKeys(DeliveryReading.reads(input)))(service.deliveryReading(input).pipe(Effect.orDie)),
			"inputs.support": (input) => stream(readKeys(Support.reads(input)))(service.support(input).pipe(Effect.orDie)),
		});
	}),
);
export const inputs = handlers.pipe(Layer.provideMerge(Inputs.layer));
