import { defineService, type ServiceRequirements } from "@antumbra/service-definition";
import { describe, expect, it } from "@effect/vitest";
import { Context, Data, Deferred, Effect, Fiber, Layer, PubSub, Ref, type Scope } from "effect";

class InitializationFailed extends Data.TaggedError("InitializationFailed")<{
	readonly detail: string;
}> {}

const noRequirements = [] as const;
type NoRequirements<Success, Failure = never, CallerRequirements extends Scope.Scope = never> = ServiceRequirements<
	typeof noRequirements,
	Success,
	Failure,
	CallerRequirements
>;

const declaredRequirementProof = () =>
	Effect.gen(function* () {
		class Declared extends Context.Service<Declared, { readonly identity: object }>()("test/Declared") {}
		const requirements = [Declared] as const;
		type Requirements<Success> = ServiceRequirements<typeof requirements, Success>;
		const RequiredService = defineService({
			id: "test/RequiredService",
			initialize: Effect.fn("requiredService.initialize")(function* (): Requirements<{ readonly identity: object }> {
				return { identity: (yield* Declared).identity };
			})(),
			methods: (state) => ({
				sameIdentity: Effect.fn("requiredService.sameIdentity")(function* (): Requirements<boolean> {
					return (yield* Declared).identity === state.identity;
				}),
			}),
			requires: requirements,
		});
		const identity = {};
		const layer = RequiredService.layer.pipe(Layer.provide(Layer.succeed(Declared)({ identity })));

		expect(
			yield* RequiredService.pipe(
				Effect.flatMap((service) => service.sameIdentity()),
				Effect.provide(layer, { local: true }),
			),
		).toBe(true);
	});

const processLifetimeProof = () =>
	Effect.gen(function* () {
		const initializations = yield* Ref.make(0);
		const finalizations = yield* Ref.make(0);
		const factoryCalls = { value: 0 };
		const initialize = Effect.fn("testService.initialize")(function* (): NoRequirements<{ readonly identity: object }, never, Scope.Scope> {
			yield* Ref.update(initializations, (count) => count + 1);
			yield* Effect.addFinalizer(() => Ref.update(finalizations, (count) => count + 1));
			return { identity: {} };
		})();
		const TestService = defineService({
			id: "test/OneLifetime",
			initialize,
			methods: (state) => {
				factoryCalls.value += 1;
				return {
					identity: Effect.fn("testService.identity")(() => Effect.succeed(state.identity)),
				};
			},
			requires: noRequirements,
		});
		const identities = yield* Effect.gen(function* () {
			const first = yield* TestService;
			const second = yield* TestService;
			return yield* Effect.all([first.identity(), second.identity()]);
		}).pipe(Effect.provide(TestService.layer, { local: true }));

		expect(identities[0]).toBe(identities[1]);
		expect(yield* Ref.get(initializations)).toBe(1);
		expect(factoryCalls.value).toBe(1);
		expect(yield* Ref.get(finalizations)).toBe(1);
	});

describe("defineService", () => {
	it.effect("provides the one declared requirement to initialization and methods", declaredRequirementProof);

	it.effect("initializes private state and constructs methods once per layer", processLifetimeProof);

	it.effect("does not construct methods when initialization fails", () =>
		Effect.gen(function* () {
			const factoryCalls = { value: 0 };
			const initialize: NoRequirements<never, InitializationFailed> = Effect.fail(new InitializationFailed({ detail: "refused" }));
			const FailedService = defineService({
				id: "test/FailedInitialization",
				initialize,
				methods: (_state) => {
					factoryCalls.value += 1;
					return {
						value: Effect.fn("failedService.value")(() => Effect.succeed("unreachable")),
					};
				},
				requires: noRequirements,
			});

			const failure = yield* FailedService.pipe(Effect.provide(FailedService.layer, { local: true }), Effect.flip);
			expect(failure.detail).toBe("refused");
			expect(factoryCalls.value).toBe(0);
		}),
	);

	it.effect("allows an exact fake to replace live initialization", () =>
		Effect.gen(function* () {
			const initializations = yield* Ref.make(0);
			const Fakeable = defineService({
				id: "test/Fakeable",
				initialize: Ref.update(initializations, (count) => count + 1),
				methods: (_state) => ({
					value: Effect.fn("fakeable.value")(() => Effect.succeed("live")),
				}),
				requires: noRequirements,
			});
			const fake = Layer.succeed(Fakeable)({
				value: () => Effect.succeed("fake"),
			});

			const value = yield* Fakeable.pipe(
				Effect.flatMap((service) => service.value()),
				Effect.provide(fake),
			);
			expect(value).toBe("fake");
			expect(yield* Ref.get(initializations)).toBe(0);
		}),
	);

	it.effect("constructs separate state in separate layer scopes", () =>
		Effect.gen(function* () {
			const initializations = yield* Ref.make(0);
			const finalizations = yield* Ref.make(0);
			const ScopedIdentity = defineService({
				id: "test/ScopedIdentity",
				initialize: Effect.acquireRelease(
					Ref.update(initializations, (count) => count + 1).pipe(Effect.andThen(Effect.sync(() => ({ identity: {} })))),
					() => Ref.update(finalizations, (count) => count + 1),
				),
				methods: (state) => ({
					identity: Effect.fn("scopedIdentity.identity")(() => Effect.succeed(state.identity)),
				}),
				requires: noRequirements,
			});
			const identity = (layer: Layer.Layer<typeof ScopedIdentity.key>) =>
				ScopedIdentity.pipe(
					Effect.flatMap((service) => service.identity()),
					Effect.provide(layer),
				);

			const first = yield* identity(Layer.fresh(ScopedIdentity.layer));
			const second = yield* identity(Layer.fresh(ScopedIdentity.layer));
			expect(first).not.toBe(second);
			expect(yield* Ref.get(initializations)).toBe(2);
			expect(yield* Ref.get(finalizations)).toBe(2);
		}),
	);

	it.effect("keeps scoped subscription ownership on the observing caller", () =>
		Effect.gen(function* () {
			const ObservationService = defineService({
				id: "test/Observation",
				initialize: Effect.gen(function* () {
					const durable = yield* Ref.make(0);
					const feed = yield* PubSub.unbounded<number>();
					return { durable, feed };
				}),
				methods: (state) => ({
					commit: Effect.fn("observation.commit")(function* (value: number): NoRequirements<void> {
						yield* Ref.set(state.durable, value);
						yield* PubSub.publish(state.feed, value);
					}),
					observe: Effect.fn("observation.observe")(function* (
						subscribed: Deferred.Deferred<void>,
						proceed: Deferred.Deferred<void>,
					): NoRequirements<
						{
							readonly snapshot: number;
							readonly subscription: PubSub.Subscription<number>;
						},
						never,
						Scope.Scope
					> {
						const subscription = yield* PubSub.subscribe(state.feed);
						yield* Deferred.succeed(subscribed, undefined);
						yield* Deferred.await(proceed);
						return {
							snapshot: yield* Ref.get(state.durable),
							subscription,
						};
					}),
				}),
				requires: noRequirements,
			});

			const result = yield* Effect.scoped(
				Effect.gen(function* () {
					const service = yield* ObservationService;
					const subscribed = yield* Deferred.make<void>();
					const proceed = yield* Deferred.make<void>();
					const observer = yield* Effect.forkChild(service.observe(subscribed, proceed));
					yield* Deferred.await(subscribed);
					yield* service.commit(1);
					yield* Deferred.succeed(proceed, undefined);
					const reading = yield* Fiber.join(observer);
					return {
						notice: yield* PubSub.take(reading.subscription),
						snapshot: reading.snapshot,
					};
				}).pipe(Effect.provide(ObservationService.layer, { local: true })),
			);
			expect(result).toEqual({ notice: 1, snapshot: 1 });
		}),
	);
});
