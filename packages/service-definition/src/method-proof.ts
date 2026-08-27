import type { Effect, Scope } from "effect";

export type AnyMethod = (
	...arguments_: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, unknown>;

export type MethodRecord = Readonly<Record<string, AnyMethod>>;

interface GenericOrOverloadedMethodsAreUnsupported {
	readonly _serviceDefinitionError: "generic and overloaded methods are unsupported";
}

type SupportedMethod<Method> = Method extends AnyMethod
	? Method extends (...arguments_: infer Arguments) => infer Result
		? ((...arguments_: Arguments) => Result) extends Method
			? Method
			: GenericOrOverloadedMethodsAreUnsupported
		: GenericOrOverloadedMethodsAreUnsupported
	: Method;

type MethodRequirements<Method> = Method extends (
	...arguments_: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, infer Requirements>
	? Requirements
	: never;

interface MethodHasUndeclaredServiceRequirements {
	readonly _serviceDefinitionError: "method has service requirements absent from the service declaration";
}

export type MethodProof<Methods extends MethodRecord, Requirements> = {
	readonly [Name in keyof Methods]: SupportedMethod<Methods[Name]> &
		([
			Exclude<MethodRequirements<Methods[Name]>, Requirements | Scope.Scope>,
		] extends [never]
			? Methods[Name]
			: MethodHasUndeclaredServiceRequirements);
};
