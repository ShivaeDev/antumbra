import { LifecycleContract } from "@antumbra/server-lifecycle/contract.ts";
import { Effect, Layer } from "effect";
import { unexpectedClear, unexpectedRecord } from "#failures.ts";
import { Lifecycle } from "#service.ts";
export const handlers = LifecycleContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Lifecycle;
		return LifecycleContract.application.of({
			"lifecycle.record": (input) => service.record(input).pipe(Effect.catchIf(unexpectedRecord, Effect.die)),
			"lifecycle.clear": (input) => service.clear(input).pipe(Effect.catchIf(unexpectedClear, Effect.die)),
			"lifecycle.pending": (input) => service.pending(input).pipe(Effect.orDie),
		});
	}),
);
export const lifecycle = handlers.pipe(Layer.provideMerge(Lifecycle.layer));
