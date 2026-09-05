import { IntentDemand, IntentDemandPassFailed, type IntentDemandRegistration, intentDemandLayer } from "@antumbra/intent-demand";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Ref } from "effect";
import { TestClock } from "effect/testing";

const registration = (tag: string, pass: Effect.Effect<void, IntentDemandPassFailed>): IntentDemandRegistration<never> => ({ pass, tag });

const demandHealth = IntentDemand.use((service) => service.health());
const requestPass = IntentDemand.use((service) => service.request());

const runWith = <A, E>(registrations: ReadonlyArray<IntentDemandRegistration<never>>, effect: Effect.Effect<A, E, IntentDemand>) =>
	effect.pipe(Effect.provide(intentDemandLayer(registrations)));

it.effect("finishes the initial pass before exposing healthy service", () =>
	Effect.gen(function* () {
		const passes = yield* Ref.make(0);
		yield* runWith(
			[
				registration(
					"test/initial",
					Ref.update(passes, (count) => count + 1),
				),
			],
			Effect.gen(function* () {
				expect(yield* Ref.get(passes)).toBe(1);
				expect((yield* demandHealth).get("test/initial")?.state).toBe("healthy");
			}),
		);
	}),
);

it.effect("isolates mortal health and restores it after a later pass", () =>
	Effect.gen(function* () {
		const fails = yield* Ref.make(true);
		const healthyPasses = yield* Ref.make(0);
		const failure = new IntentDemandPassFailed({
			detail: "durable truth unavailable",
			tag: "test/mortal",
		});
		const mortal = registration("test/mortal", Ref.get(fails).pipe(Effect.flatMap((fail) => (fail ? Effect.fail(failure) : Effect.void))));
		const healthy = registration(
			"test/healthy",
			Ref.update(healthyPasses, (count) => count + 1),
		);
		yield* runWith(
			[mortal, healthy],
			Effect.gen(function* () {
				const initial = yield* demandHealth;
				expect(initial.get("test/mortal")).toMatchObject({
					failure,
					state: "degraded",
				});
				expect(initial.get("test/healthy")?.state).toBe("healthy");
				expect(yield* Ref.get(healthyPasses)).toBe(1);
				yield* Ref.set(fails, false);
				yield* TestClock.adjust(5_000);
				expect((yield* demandHealth).get("test/mortal")?.state).toBe("healthy");
				expect(initial.get("test/mortal")?.state).toBe("degraded");
			}),
		);
	}),
);

it.effect("runs after bounded patience when every wake is lost", () =>
	Effect.gen(function* () {
		const passes = yield* Ref.make(0);
		yield* runWith(
			[
				registration(
					"test/bounded",
					Ref.update(passes, (count) => count + 1),
				),
			],
			Effect.gen(function* () {
				expect(yield* Ref.get(passes)).toBe(1);
				yield* TestClock.adjust(5_000);
				expect(yield* Ref.get(passes)).toBe(2);
			}),
		);
	}),
);

it.effect("coalesces a burst to one pending pass", () =>
	Effect.gen(function* () {
		const passes = yield* Ref.make(0);
		const secondStarted = yield* Deferred.make<void>();
		const thirdStarted = yield* Deferred.make<void>();
		const releaseSecond = yield* Deferred.make<void>();
		const pass = Ref.updateAndGet(passes, (count) => count + 1).pipe(
			Effect.flatMap((count) => {
				if (count === 2) return Deferred.succeed(secondStarted, undefined).pipe(Effect.andThen(Deferred.await(releaseSecond)));
				if (count === 3) return Deferred.succeed(thirdStarted, undefined);
				return Effect.void;
			}),
		);
		yield* runWith(
			[registration("test/coalesced", pass)],
			Effect.gen(function* () {
				yield* requestPass;
				yield* Deferred.await(secondStarted);
				yield* Effect.forEach(Array.from({ length: 20 }), () => requestPass);
				expect(yield* Ref.get(passes)).toBe(2);
				yield* Deferred.succeed(releaseSecond, undefined);
				yield* Deferred.await(thirdStarted);
				expect(yield* Ref.get(passes)).toBe(3);
			}),
		);
	}),
);
