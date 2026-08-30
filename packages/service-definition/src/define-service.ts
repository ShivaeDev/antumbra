import { Context, Effect, Layer, Record } from "effect";
import type { AnyMethod, GenericMethodDescriptor } from "#generic-method.ts";
import type { InitializerProof } from "#initializer-proof.ts";
import type { MethodEntry, MethodInventory, MethodProof, MethodRecord, RuntimeMethodInventory } from "#method-proof.ts";
import type { RequirementProof } from "#requirement-proof.ts";
import type { RequirementRecord, RequirementsOf } from "#service-requirements.ts";

type BoundMethod<Method, Requirements> = Method extends (
	...arguments_: infer Arguments
) => Effect.Effect<infer Success, infer Failure, infer Residual>
	? (...arguments_: Arguments) => Effect.Effect<Success, Failure, Exclude<Residual, Requirements>>
	: never;

type PublicMethod<Entry, Requirements> = Entry extends GenericMethodDescriptor<infer Method> ? Method : BoundMethod<Entry, Requirements>;

type ServiceShape<Methods extends MethodInventory, Requirements extends RequirementRecord> = Readonly<{
	[Name in keyof Methods]: PublicMethod<Methods[Name], RequirementsOf<Requirements>>;
}>;

interface ServiceDefinition<
	Identifier extends string,
	Requirements extends RequirementRecord,
	Initializer extends Effect.Effect<unknown, unknown, unknown>,
	Methods extends MethodInventory,
> {
	readonly id: Identifier;
	readonly initialize: Initializer & InitializerProof<Initializer, RequirementsOf<Requirements>>;
	readonly methods: (state: Effect.Success<Initializer>) => Methods & MethodProof<NoInfer<Methods>, Requirements>;
	readonly requires: Requirements & RequirementProof<Requirements>;
}

interface RuntimeDefinition<State> {
	readonly id: string;
	readonly initialize: Effect.Effect<State, unknown, unknown>;
	readonly methods: (state: State) => RuntimeMethodInventory;
	readonly requires: RequirementRecord;
}

type DefinedService<Identifier extends string, Shape, Failure, Requirements> = Context.Service<Identifier, Shape> & {
	readonly layer: Layer.Layer<Identifier, Failure, Requirements>;
};

export function defineService<
	const Identifier extends string,
	const Requirements extends RequirementRecord,
	const Initializer extends Effect.Effect<unknown, unknown, unknown>,
	const Methods extends MethodInventory,
>(
	definition: ServiceDefinition<Identifier, Requirements, Initializer, Methods>,
): DefinedService<Identifier, ServiceShape<Methods, Requirements>, Effect.Error<Initializer>, RequirementsOf<Requirements>>;
export function defineService<State>(definition: RuntimeDefinition<State>): unknown {
	const service = Context.Service<string, MethodRecord>(definition.id);
	const layer = Layer.effect(service)(
		Effect.gen(function* () {
			const ambient = yield* Effect.context<string>();
			const declared = Context.pick(...definition.requires)(ambient);
			const state = yield* Effect.provide(definition.initialize, declared);
			return Record.map(definition.methods(state), (entry: MethodEntry) => {
				const method: AnyMethod = typeof entry === "function" ? entry : entry.method;
				return (...arguments_: ReadonlyArray<never>) => Effect.provide(method(...arguments_), declared);
			});
		}),
	);
	return Object.assign(service, { layer });
}
