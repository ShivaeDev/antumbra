import {
	defineService,
	type ServiceRequirements,
} from "@antumbra/service-definition";
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

const ordinaryRequirements = [Declared, Residual] as const;
type Requirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<
	typeof ordinaryRequirements,
	Success,
	Failure,
	Passthrough
>;

const unary = Effect.fn("ordinary.unary")(function* (
	value: string,
): Requirements<number, FixtureFailure> {
	const declared = yield* Declared;
	if (value.length === 0) {
		return yield* new FixtureFailure({ detail: declared.value });
	}
	return value.length;
});

const variadic = Effect.fn("ordinary.variadic")(function* (
	...values: Array<number>
): Requirements<ReadonlyArray<number>> {
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
	requires: ordinaryRequirements,
	operations: { unary, variadic, workflow },
});

export const Initialized = defineService({
	id: "fixture/Initialized",
	requires: ordinaryRequirements,
	operations: Effect.gen(function* () {
		const declared = yield* Declared;
		const residual = yield* Residual;
		return { value: Effect.succeed(`${declared.value}:${residual.value}`) };
	}),
});

const constructedRequirements = [] as const;
type ConstructedRequirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<
	typeof constructedRequirements,
	Success,
	Failure,
	Passthrough
>;

const genericIdentity = Effect.fn("constructed.genericIdentity")(function* <
	Value,
>(value: Value): ConstructedRequirements<Value> {
	return yield* Effect.succeed(value);
});

const use = Effect.fn("constructed.use")(function* <Success, Failure, Residual>(
	effect: Effect.Effect<Success, Failure, Residual>,
): ConstructedRequirements<Success, Failure, Residual> {
	return yield* effect;
});

function overloaded(value: string): Effect.Effect<string>;
function overloaded(value: number): Effect.Effect<number>;
function overloaded(value: string | number) {
	return Effect.succeed(value);
}

export const Constructed = defineService({
	id: "fixture/Constructed",
	requires: constructedRequirements,
	operations: Effect.succeed({ genericIdentity, overloaded, use }),
});

export const ordinaryLayer = Ordinary.layer;
export const initializedLayer = Initialized.layer;
export const constructedLayer = Constructed.layer;
export const genericResult = Constructed.use((service) =>
	service.genericIdentity({ readonly: true } as const),
);
export const overloadResult = Constructed.use((service) =>
	service.overloaded("value"),
);
export const passthroughResult = Constructed.use((service) =>
	service.use(Declared),
);
