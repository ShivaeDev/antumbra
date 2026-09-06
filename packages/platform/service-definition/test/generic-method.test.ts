import { defineService } from "@antumbra/service-definition/define-service.ts";
import { genericMethod } from "@antumbra/service-definition/generic-method.ts";
import { expect, it } from "@effect/vitest";
import { Context, Effect } from "effect";

class Caller extends Context.Service<Caller, { readonly value: number }>()("test/GenericCaller") {}

const preserve = <Success, Failure, Requirements>(
	effect: Effect.Effect<Success, Failure, Requirements>,
): Effect.Effect<{ readonly value: Success }, Failure, Requirements> => Effect.map(effect, (value) => ({ value }));

const Generic = defineService({
	id: "test/Generic",
	initialize: Effect.void,
	methods: () => ({ preserve: genericMethod(preserve) }),
	requires: [],
});

it.effect("preserves each generic call's caller requirement", () =>
	Effect.gen(function* () {
		const result = yield* Generic.pipe(
			Effect.flatMap((service) => service.preserve(Effect.map(Caller, ({ value }) => value))),
			Effect.provide(Generic.layer, { local: true }),
			Effect.provideService(Caller, { value: 42 }),
		);

		expect(result).toEqual({ value: 42 });
	}),
);
