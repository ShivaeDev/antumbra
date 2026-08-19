import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer, Ref } from "effect";
import { defineService } from "#define-service.ts";
import type { ServiceRequirements } from "#service-requirements.ts";

class Declared extends Context.Service<
	Declared,
	{ readonly identity: object; readonly value: string }
>()("test/Declared") {}

class Residual extends Context.Service<Residual, { readonly value: string }>()(
	"test/Residual",
) {}

const requirements = [Declared, Residual] as const;
type Requirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<typeof requirements, Success, Failure, Passthrough>;

const declaredIdentity = Effect.fn("runtimeDefinition.declaredIdentity")(
	function* (): Requirements<object> {
		return (yield* Declared).identity;
	},
);

const residualValue = Effect.fn("runtimeDefinition.residualValue")(
	function* (): Requirements<string> {
		const declared = yield* Declared;
		const residual = yield* Residual;
		return `${declared.value}:${residual.value}`;
	},
);

const residualWorkflow = Effect.gen(function* () {
	const declared = yield* Declared;
	const residual = yield* Residual;
	return `${declared.value}:${residual.value}:workflow`;
});

const RuntimeDefinition = defineService({
	id: "test/RuntimeDefinition",
	requires: requirements,
	operations: { declaredIdentity, residualValue, residualWorkflow },
});

describe("defineService", () => {
	it.effect("captures each declared requirement once per layer instance", () =>
		Effect.gen(function* () {
			const acquisitions = yield* Ref.make(0);
			const identity = {};
			const declared = Layer.effect(
				Declared,
				Ref.updateAndGet(acquisitions, (count) => count + 1).pipe(
					Effect.as({ identity, value: "declared" }),
				),
			);
			const dependencies = Layer.merge(
				declared,
				Layer.succeed(Residual)({ value: "residual" }),
			);
			const result = yield* Effect.gen(function* () {
				const service = yield* RuntimeDefinition;
				return yield* Effect.all([
					service.declaredIdentity(),
					service.declaredIdentity(),
				]);
			}).pipe(
				Effect.provide(
					RuntimeDefinition.layer.pipe(Layer.provide(dependencies)),
				),
			);
			expect(result).toEqual([identity, identity]);
			expect(yield* Ref.get(acquisitions)).toBe(1);
		}),
	);

	it.effect("closes declared requirements for functions and workflows", () =>
		Effect.gen(function* () {
			const dependencies = Layer.merge(
				Layer.succeed(Declared)({ identity: {}, value: "declared" }),
				Layer.succeed(Residual)({ value: "captured" }),
			);
			const program = Effect.gen(function* () {
				const service = yield* RuntimeDefinition;
				return yield* Effect.all([
					service.residualValue(),
					service.residualWorkflow,
				]);
			}).pipe(
				Effect.provide(
					RuntimeDefinition.layer.pipe(Layer.provide(dependencies)),
				),
			);
			expect(yield* program).toEqual([
				"declared:captured",
				"declared:captured:workflow",
			]);
		}),
	);

	it.effect(
		"supports direct service substitution without constructing live",
		() =>
			Effect.gen(function* () {
				const identity = {};
				const result = yield* Effect.gen(function* () {
					const service = yield* RuntimeDefinition;
					return yield* service.declaredIdentity();
				}).pipe(
					Effect.provide(
						Layer.succeed(RuntimeDefinition)({
							declaredIdentity: () => Effect.succeed(identity),
							residualValue: () => Effect.succeed("substitute"),
							residualWorkflow: Effect.succeed("substitute-workflow"),
						}),
					),
				);
				expect(result).toBe(identity);
			}),
	);

	it.effect(
		"constructs shared state once and finalizes it with the layer scope",
		() =>
			Effect.gen(function* () {
				const constructions = yield* Ref.make(0);
				const finalizations = yield* Ref.make(0);
				const identity = {};
				const Stateful = defineService({
					id: "test/Stateful",
					requires: [Declared],
					operations: Effect.gen(function* () {
						const declared = yield* Declared;
						yield* Ref.update(constructions, (count) => count + 1);
						yield* Effect.addFinalizer(() =>
							Ref.update(finalizations, (count) => count + 1),
						);
						const current = Effect.succeed(declared.identity);
						return { current };
					}),
				});
				const live = Stateful.layer.pipe(
					Layer.provide(
						Layer.succeed(Declared)({ identity, value: "stateful" }),
					),
				);
				const values = yield* Effect.scoped(
					Effect.gen(function* () {
						const stateful = yield* Stateful;
						return yield* Effect.all([stateful.current, stateful.current]);
					}).pipe(Effect.provide(live)),
				);
				expect(values[0]).toBe(values[1]);
				expect(values[0]).toBe(identity);
				expect(yield* Ref.get(constructions)).toBe(1);
				expect(yield* Ref.get(finalizations)).toBe(1);
			}),
	);
});
