import { Effect, Queue, Ref } from "effect";
import type { IntentDemandHealth } from "#health-reading.ts";
import { Registrations } from "#registrations.ts";
import { runRegistration } from "#run-registration.ts";

const PATIENCE_MILLIS = 5_000;

export const initializeIntentDemand = Effect.fn("IntentDemand.initialize")(function* () {
	const registrations = yield* Registrations;
	const health = yield* Ref.make<ReadonlyMap<string, IntentDemandHealth>>(new Map());
	const tick = yield* Queue.sliding<void>(1);
	const pass = Effect.forEach(registrations, (registration) => runRegistration(health, registration), {
		concurrency: "unbounded",
		discard: true,
	});
	yield* pass;
	yield* Effect.forkScoped(
		Effect.fnUntraced(function* () {
			while (true) {
				yield* Effect.timeoutOption(Queue.take(tick), PATIENCE_MILLIS);
				yield* pass;
			}
		})(),
	);
	return { health, tick };
})();
