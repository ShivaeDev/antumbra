import type { Effect, Scope } from "effect";

export type AnyMethod = (
	...arguments_: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, unknown>;

export type MethodRecord = Readonly<Record<string, AnyMethod>>;

interface GenericOrStructurallyOverloadedMethodsAreUnsupported {
	readonly _serviceDefinitionError: "generic and structurally overloaded methods are unsupported";
}

type Same<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

type HasDistinctCallSignatures<Method> = Method extends {
	(...arguments_: infer FirstArguments): infer FirstResult;
	(...arguments_: infer LastArguments): infer LastResult;
}
	? Same<FirstArguments, LastArguments> extends true
		? Same<FirstResult, LastResult> extends true
			? false
			: true
		: true
	: false;

type SupportedMethod<Method> = Method extends AnyMethod
	? HasDistinctCallSignatures<Method> extends true
		? GenericOrStructurallyOverloadedMethodsAreUnsupported
		: Method extends (...arguments_: infer Arguments) => infer Result
			? ((...arguments_: Arguments) => Result) extends Method
				? Method
				: GenericOrStructurallyOverloadedMethodsAreUnsupported
			: GenericOrStructurallyOverloadedMethodsAreUnsupported
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
