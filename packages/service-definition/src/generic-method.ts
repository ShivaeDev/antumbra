import type { Effect } from "effect";

export type AnyMethod = (...arguments_: ReadonlyArray<never>) => Effect.Effect<unknown, unknown, unknown>;

export interface GenericMethodDescriptor<Method extends AnyMethod> {
	readonly _tag: "GenericMethod";
	readonly method: Method;
}

type Same<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false;

export type HasDistinctCallSignatures<Method> = Method extends {
	(...arguments_: infer FirstArguments): infer FirstResult;
	(...arguments_: infer LastArguments): infer LastResult;
}
	? Same<FirstArguments, LastArguments> extends true
		? Same<FirstResult, LastResult> extends true
			? false
			: true
		: true
	: false;

interface GenericOrStructurallyOverloadedMethodsAreUnsupported {
	readonly _serviceDefinitionError: "generic and structurally overloaded methods are unsupported";
}

type MarkedMethod<Method extends AnyMethod> =
	HasDistinctCallSignatures<Method> extends true ? GenericOrStructurallyOverloadedMethodsAreUnsupported : GenericMethodDescriptor<Method>;

export function genericMethod<Method extends AnyMethod>(method: Method): MarkedMethod<Method>;
export function genericMethod(method: AnyMethod): unknown {
	return { _tag: "GenericMethod", method };
}
