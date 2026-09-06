import type { Effect, Scope } from "effect";

interface InitializerHasUndeclaredServiceRequirements {
	readonly _serviceDefinitionError: "initializer has service requirements absent from the service declaration";
}

export type InitializerProof<Initializer, Requirements> =
	Initializer extends Effect.Effect<unknown, unknown, infer Residual>
		? [Exclude<Residual, Requirements | Scope.Scope>] extends [never]
			? Initializer
			: InitializerHasUndeclaredServiceRequirements
		: never;
