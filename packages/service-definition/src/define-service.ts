import { Context, Effect, Layer, Record } from "effect";
import type { InitializerProof } from "#initializer-proof.ts";
import type { AnyMethod, MethodProof, MethodRecord } from "#method-proof.ts";
import type {
	RequirementRecord,
	RequirementsOf,
} from "#service-requirements.ts";

type BoundMethod<Method, Requirements> = Method extends (
	...arguments_: infer Arguments
) => Effect.Effect<infer Success, infer Failure, infer Residual>
	? (
			...arguments_: Arguments
		) => Effect.Effect<Success, Failure, Exclude<Residual, Requirements>>
	: never;

type ServiceShape<Methods extends MethodRecord, Requirements> = Readonly<{
	[Name in keyof Methods]: BoundMethod<Methods[Name], Requirements>;
}>;

interface ServiceDefinition<
	Identifier extends string,
	Requirements extends RequirementRecord,
	Initializer extends Effect.Effect<unknown, unknown, unknown>,
	Methods extends MethodRecord,
> {
	readonly id: Identifier;
	readonly initialize: Initializer &
		InitializerProof<Initializer, RequirementsOf<Requirements>>;
	readonly methods: (
		state: Effect.Success<Initializer>,
	) => Methods & MethodProof<Methods, RequirementsOf<Requirements>>;
	readonly requires: Requirements;
}

interface RuntimeDefinition<State> {
	readonly id: string;
	readonly initialize: Effect.Effect<State, unknown, unknown>;
	readonly methods: (state: State) => MethodRecord;
	readonly requires: RequirementRecord;
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
	const Initializer extends Effect.Effect<unknown, unknown, unknown>,
	const Methods extends MethodRecord,
>(
	definition: ServiceDefinition<Identifier, Requirements, Initializer, Methods>,
): DefinedService<
	Identifier,
	ServiceShape<Methods, RequirementsOf<Requirements>>,
	Effect.Error<Initializer>,
	RequirementsOf<Requirements>
>;
export function defineService<State>(
	definition: RuntimeDefinition<State>,
): unknown {
	const service = Context.Service<string, MethodRecord>(definition.id);
	const layer = Layer.effect(service)(
		Effect.gen(function* () {
			const ambient = yield* Effect.context<string>();
			const declared = Context.pick(...definition.requires)(ambient);
			const state = yield* Effect.provide(definition.initialize, declared);
			return Record.map(
				definition.methods(state),
				(method: AnyMethod) =>
					(...arguments_: ReadonlyArray<never>) =>
						Effect.provide(method(...arguments_), declared),
			);
		}),
	);
	return Object.assign(service, { layer });
}
