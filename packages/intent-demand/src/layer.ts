import { Clock, Effect, Layer, Queue, Ref, Result } from "effect";
import { IntentDemand, type IntentDemandHealth } from "#intent-demand.ts";
import type { IntentDemandRegistration } from "#registration.ts";

const PATIENCE_MILLIS = 5_000;

const runRegistration = Effect.fn("IntentDemand.runRegistration")(function* <R>(
	health: Ref.Ref<ReadonlyMap<string, IntentDemandHealth>>,
	registration: IntentDemandRegistration<R>,
) {
	const result = yield* Effect.result(registration.pass);
	const now = yield* Clock.currentTimeMillis;
	const value: IntentDemandHealth = Result.isFailure(result)
		? { failedAtMillis: now, failure: result.failure, state: "degraded" }
		: { checkedAtMillis: now, state: "healthy" };
	yield* Ref.update(health, (current) => new Map(current).set(registration.tag, value));
	if (Result.isFailure(result)) {
		yield* Effect.logWarning("intent demand pass degraded", {
			detail: result.failure.detail,
			tag: registration.tag,
		});
	}
});

export const IntentDemandLive = <R>(registrations: ReadonlyArray<IntentDemandRegistration<R>>) =>
	Layer.effect(
		IntentDemand,
		Effect.gen(function* () {
			const health = yield* Ref.make<ReadonlyMap<string, IntentDemandHealth>>(new Map());
			const tick = yield* Queue.sliding<void>(1);
			const pass = Effect.forEach(registrations, (registration) => runRegistration(health, registration), {
				concurrency: "unbounded",
				discard: true,
			});
			yield* pass;
			yield* Effect.forkScoped(
				Effect.gen(function* () {
					while (true) {
						yield* Effect.timeoutOption(Queue.take(tick), PATIENCE_MILLIS);
						yield* pass;
					}
				}),
			);
			return IntentDemand.of({
				health: Ref.get(health),
				request: Queue.offer(tick, undefined).pipe(Effect.asVoid),
			});
		}),
	);
