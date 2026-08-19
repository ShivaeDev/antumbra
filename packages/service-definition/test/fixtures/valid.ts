import { defineService } from "@antumbra/service-definition";
import { Context, Data, Effect } from "effect";

class Declared extends Context.Service<Declared, { readonly value: string }>()(
	"fixture/Declared",
) {}

class Residual extends Context.Service<Residual, { readonly value: number }>()(
	"fixture/Residual",
) {}

class FixtureFailure extends Data.TaggedError("FixtureFailure")<{
	readonly detail: string;
}> {}

const unary = Effect.fn("ordinary.unary")(function* (
	value: string,
): Effect.fn.Return<number, FixtureFailure, Declared> {
	const declared = yield* Declared;
	if (value.length === 0) {
		return yield* new FixtureFailure({ detail: declared.value });
	}
	return value.length;
});

const variadic = Effect.fn("ordinary.variadic")(function* (
	...values: Array<number>
): Effect.fn.Return<ReadonlyArray<number>, never, Declared | Residual> {
	yield* Declared;
	const residual = yield* Residual;
	return [...values, residual.value] as const;
});

const workflow: Effect.Effect<readonly ["ready"], never, Declared> = Effect.as(
	Declared,
	["ready"] as const,
);

export const Ordinary = defineService({
	id: "fixture/Ordinary",
	requires: [Declared],
	operations: { unary, variadic, workflow },
});

const genericIdentity = Effect.fn("constructed.genericIdentity")(function* <
	Value,
>(value: Value): Effect.fn.Return<Value> {
	return yield* Effect.succeed(value);
});

function overloaded(value: string): Effect.Effect<string>;
function overloaded(value: number): Effect.Effect<number>;
function overloaded(value: string | number) {
	return Effect.succeed(value);
}

export const Constructed = defineService({
	id: "fixture/Constructed",
	requires: [],
	operations: Effect.succeed({ genericIdentity, overloaded }),
});

export const ordinaryLayer = Ordinary.layer;
export const constructedLayer = Constructed.layer;
export const genericResult = Constructed.use((service) =>
	service.genericIdentity({ readonly: true } as const),
);
export const overloadResult = Constructed.use((service) =>
	service.overloaded("value"),
);
