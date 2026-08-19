import { Context, Effect, Layer, Record, type Scope } from "effect";

type AnyOperation = (
	...arguments_: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, unknown>;
type AnyOperationMember =
	| AnyOperation
	| Effect.Effect<unknown, unknown, unknown>;
type OperationRecord = Readonly<Record<string, AnyOperationMember>>;
type RequirementRecord = ReadonlyArray<Context.Service.Any>;

type RequirementsOf<Requirements extends RequirementRecord> =
	Context.Service.Identifier<Requirements[number]>;
type BoundOperation<Member, Requirements> = Member extends (
	...arguments_: infer Arguments
) => Effect.Effect<infer Success, infer Failure, infer Residual>
	? (
			...arguments_: Arguments
		) => Effect.Effect<Success, Failure, Exclude<Residual, Requirements>>
	: Member extends Effect.Effect<infer Success, infer Failure, infer Residual>
		? Effect.Effect<Success, Failure, Exclude<Residual, Requirements>>
		: never;

type ServiceShape<Operations extends OperationRecord, Requirements> = Readonly<{
	[Name in keyof Operations]: BoundOperation<Operations[Name], Requirements>;
}>;

interface GenericOrOverloadedOperationsRequireAnInitializerEffect {
	readonly _serviceDefinitionError: "generic and overloaded operations require an initializer Effect";
}
type SupportedOperation<Operation> = Operation extends AnyOperation
	? Operation extends (...arguments_: infer Arguments) => infer Result
		? ((...arguments_: Arguments) => Result) extends Operation
			? Operation
			: GenericOrOverloadedOperationsRequireAnInitializerEffect
		: GenericOrOverloadedOperationsRequireAnInitializerEffect
	: Operation;

type SupportedOperations<Operations extends OperationRecord> = {
	readonly [Name in keyof Operations]: SupportedOperation<Operations[Name]>;
};

interface DirectDefinition<
	Identifier extends string,
	Requirements extends RequirementRecord,
	Operations extends OperationRecord,
> {
	readonly id: Identifier;
	readonly operations: Operations & SupportedOperations<Operations>;
	readonly requires: Requirements;
}

interface InitializerDefinition<
	Identifier extends string,
	Requirements extends RequirementRecord,
	Operations extends OperationRecord,
	Failure,
	Residual,
> {
	readonly id: Identifier;
	readonly operations: Effect.Effect<Operations, Failure, Residual>;
	readonly requires: Requirements;
}

type DefinedService<
	Identifier extends string,
	Shape,
	Failure,
	Requirements,
> = Context.Service<Identifier, Shape> & {
	readonly layer: Layer.Layer<Identifier, Failure, Requirements>;
};
export function defineService<
	const Identifier extends string,
	const Requirements extends RequirementRecord,
	const Operations extends OperationRecord,
	Failure,
	Residual,
>(
	definition: InitializerDefinition<
		Identifier,
		Requirements,
		Operations,
		Failure,
		Residual
	>,
): DefinedService<
	Identifier,
	Operations,
	Failure,
	Exclude<Residual, Scope.Scope>
>;
export function defineService<
	const Identifier extends string,
	const Requirements extends RequirementRecord,
	const Operations extends OperationRecord,
>(
	definition: DirectDefinition<Identifier, Requirements, Operations>,
): DefinedService<
	Identifier,
	ServiceShape<Operations, RequirementsOf<Requirements>>,
	never,
	RequirementsOf<Requirements>
>;
export function defineService(
	definition:
		| DirectDefinition<string, RequirementRecord, OperationRecord>
		| InitializerDefinition<
				string,
				RequirementRecord,
				OperationRecord,
				unknown,
				unknown
		  >,
) {
	const service = Context.Service<string, OperationRecord>(definition.id);
	const operations = definition.operations;
	if (Effect.isEffect(operations)) {
		return Object.assign(service, {
			layer: Layer.effect(service)(operations),
		});
	}
	const layer = Layer.effect(service)(
		Effect.gen(function* () {
			const ambient = yield* Effect.context<string>();
			const declared = Context.pick(...definition.requires)(ambient);
			return Record.map(operations, (operation) =>
				Effect.isEffect(operation)
					? Effect.provide(operation, declared)
					: (...arguments_: ReadonlyArray<never>) =>
							Effect.provide(operation(...arguments_), declared),
			);
		}),
	);
	return Object.assign(service, { layer });
}
