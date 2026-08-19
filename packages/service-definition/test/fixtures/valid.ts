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

export const ordinaryLayer = Ordinary.layer;
