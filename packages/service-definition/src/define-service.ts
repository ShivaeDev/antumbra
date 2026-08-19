import { Context, Effect, Layer, Record } from "effect";
import type { OperationProof, OperationRecord } from "#operation-proof.ts";
import type {
	RequirementRecord,
	RequirementsOf,
} from "#service-requirements.ts";

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

interface DirectDefinition<
	Identifier extends string,
	Requirements extends RequirementRecord,
	Operations extends OperationRecord,
> {
	readonly id: Identifier;
	readonly operations: Operations &
		OperationProof<Operations, RequirementsOf<Requirements>>;
	readonly requires: Requirements;
}

interface RuntimeDefinition {
	readonly id: string;
	readonly operations: OperationRecord;
	readonly requires: RequirementRecord;
}

type DefinedService<
	Identifier extends string,
	Shape,
	Requirements,
> = Context.Service<Identifier, Shape> & {
	readonly layer: Layer.Layer<Identifier, never, Requirements>;
};
export function defineService<
	const Identifier extends string,
	const Requirements extends RequirementRecord,
	const Operations extends OperationRecord,
>(
	definition: DirectDefinition<Identifier, Requirements, Operations>,
): DefinedService<
	Identifier,
	ServiceShape<Operations, RequirementsOf<Requirements>>,
	RequirementsOf<Requirements>
>;
export function defineService(definition: RuntimeDefinition): unknown {
	const service = Context.Service<string, OperationRecord>(definition.id);
	const layer = Layer.effect(service)(
		Effect.gen(function* () {
			const ambient = yield* Effect.context<string>();
			const declared = Context.pick(...definition.requires)(ambient);
			return Record.map(definition.operations, (operation) =>
				Effect.isEffect(operation)
					? Effect.provide(operation, declared)
					: (...arguments_: ReadonlyArray<never>) =>
							Effect.provide(operation(...arguments_), declared),
			);
		}),
	);
	return Object.assign(service, { layer });
}
