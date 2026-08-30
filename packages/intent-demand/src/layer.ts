import { Clock, Effect, Layer, Queue, Ref } from "effect";
import { IntentDemand, type IntentDemandHealth } from "#intent-demand.ts";
import type { IntentDemandRegistration } from "#registration.ts";

const PATIENCE_MILLIS = 5_000;

const updateHealth = (health: Ref.Ref<ReadonlyMap<string, IntentDemandHealth>>, tag: string, value: IntentDemandHealth) =>
	Ref.update(health, (current) => new Map(current).set(tag, value));

const runRegistration = <R>(health: Ref.Ref<ReadonlyMap<string, IntentDemandHealth>>, registration: IntentDemandRegistration<R>) =>
	registration.pass.pipe(
		Effect.matchEffect({
			onFailure: (failure) =>
				Clock.currentTimeMillis.pipe(
					Effect.flatMap((failedAtMillis) =>
						updateHealth(health, registration.tag, {
							failedAtMillis,
							failure,
							state: "degraded",
						}),
					),
					Effect.andThen(
						Effect.logWarning("intent demand pass degraded", {
							detail: failure.detail,
							tag: registration.tag,
						}),
					),
				),
			onSuccess: () =>
				Clock.currentTimeMillis.pipe(
					Effect.flatMap((checkedAtMillis) =>
						updateHealth(health, registration.tag, {
							checkedAtMillis,
							state: "healthy",
						}),
					),
				),
		}),
	);

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
				health: Ref.get(health).pipe(Effect.map((current) => new Map(current))),
				request: Queue.offer(tick, undefined).pipe(Effect.asVoid),
			});
		}),
	);
