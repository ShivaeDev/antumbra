import type { Effect } from "effect";

export type AnyOperation = (
	...arguments_: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, unknown>;
export type AnyOperationMember =
	| AnyOperation
	| Effect.Effect<unknown, unknown, unknown>;
export type OperationRecord = Readonly<Record<string, AnyOperationMember>>;

interface GenericOrOverloadedOperationsAreUnsupported {
	readonly _serviceDefinitionError: "generic and overloaded direct operations are unsupported";
}

type SupportedOperation<Operation> = Operation extends AnyOperation
	? Operation extends (...arguments_: infer Arguments) => infer Result
		? ((...arguments_: Arguments) => Result) extends Operation
			? Operation
			: GenericOrOverloadedOperationsAreUnsupported
		: GenericOrOverloadedOperationsAreUnsupported
	: Operation;

type OperationRequirements<Operation> = Operation extends (
	...arguments_: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, infer Requirements>
	? Requirements
	: Operation extends Effect.Effect<unknown, unknown, infer Requirements>
		? Requirements
		: never;

interface OperationHasUndeclaredServiceRequirements {
	readonly _serviceDefinitionError: "operation has service requirements absent from the service declaration";
}

export type OperationProof<Operations extends OperationRecord, Requirements> = {
	readonly [Name in keyof Operations]: SupportedOperation<Operations[Name]> &
		([Exclude<OperationRequirements<Operations[Name]>, Requirements>] extends [
			never,
		]
			? Operations[Name]
			: OperationHasUndeclaredServiceRequirements);
};
