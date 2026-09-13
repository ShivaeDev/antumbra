import type { Effect, Schema } from "effect";
import type { CommandDefinition, CommandInput } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { Fields, Values } from "#fields.ts";
import type { PortRecord, PortShape } from "#port.ts";
import type { QueryDefinition, QueryShape } from "#query.ts";
import type { AlreadyDone, RejectedBy, RejectionSpecs } from "#rejection.ts";
import type { RowShape } from "#row.ts";

export interface Reconciling<Ports extends readonly PortShape[]> {
	readonly read: <
		Name extends string,
		Input extends Fields,
		Output extends Schema.Top,
		Reads extends readonly RowShape[],
		Needs extends readonly PortShape[],
	>(
		query: QueryDefinition<Name, Input, Output, Reads, Needs>,
		input: Values<Input>,
	) => Effect.Effect<Output["Type"]>;
	readonly commit: <
		Name extends string,
		Input extends Fields,
		Reads extends readonly RowShape[],
		Emits extends FactShape,
		Specs extends RejectionSpecs,
	>(
		command: CommandDefinition<Name, Input, Reads, Emits, Specs>,
		input: CommandInput<Input>,
	) => Effect.Effect<number, AlreadyDone | RejectedBy<Specs>>;
	readonly ports: PortRecord<Ports>;
}

export interface ReconcilerShape {
	readonly name: string;
	readonly watch: QueryShape;
	readonly input: Record<string, unknown>;
	readonly each: ((row: never) => unknown) | undefined;
	readonly due: ((reading: never, now: number) => number | undefined) | undefined;
	readonly ports: readonly PortShape[];
	readonly run: (reading: never, reconciling: never) => Effect.Effect<void, unknown>;
}

export interface ReconcilerDefinition<Name extends string, Watch extends QueryShape, Ports extends readonly PortShape[]> extends ReconcilerShape {
	readonly name: Name;
	readonly watch: Watch;
	readonly ports: Ports;
}

type Given<Input extends Fields> = [keyof Input] extends [never] ? { readonly input?: Values<Input> } : { readonly input: Values<Input> };

type Listed<Output extends Schema.Top & { readonly Type: readonly unknown[] }> = Output["Type"][number];

export function reconciler<
	Name extends string,
	Watched extends string,
	Input extends Fields,
	Output extends Schema.Top & { readonly Type: readonly unknown[] },
	Reads extends readonly RowShape[],
	Needs extends readonly PortShape[],
	Key,
	const Ports extends readonly PortShape[],
>(
	name: Name,
	declaration: Given<Input> & {
		readonly watch: QueryDefinition<Watched, Input, Output, Reads, Needs>;
		readonly each: (row: Listed<Output>) => Key;
		readonly ports: Ports;
		readonly run: (row: Listed<Output>, reconciling: Reconciling<NoInfer<Ports>>) => Effect.Effect<void, unknown>;
	},
): ReconcilerDefinition<Name, QueryDefinition<Watched, Input, Output, Reads, Needs>, Ports>;
export function reconciler<
	Name extends string,
	Watched extends string,
	Input extends Fields,
	Output extends Schema.Top,
	Reads extends readonly RowShape[],
	Needs extends readonly PortShape[],
	const Ports extends readonly PortShape[],
>(
	name: Name,
	declaration: Given<Input> & {
		readonly watch: QueryDefinition<Watched, Input, Output, Reads, Needs>;
		readonly ports: Ports;
		readonly due?: (reading: Output["Type"], now: number) => number | undefined;
		readonly run: (reading: Output["Type"], reconciling: Reconciling<NoInfer<Ports>>) => Effect.Effect<void, unknown>;
	},
): ReconcilerDefinition<Name, QueryDefinition<Watched, Input, Output, Reads, Needs>, Ports>;
export function reconciler(
	name: string,
	declaration: {
		readonly watch: QueryShape;
		readonly input?: Record<string, unknown>;
		readonly each?: (row: never) => unknown;
		readonly due?: (reading: never, now: number) => number | undefined;
		readonly ports: readonly PortShape[];
		readonly run: (reading: never, reconciling: never) => Effect.Effect<void, unknown>;
	},
): ReconcilerShape {
	return {
		due: declaration.due,
		each: declaration.each,
		input: declaration.input ?? {},
		name,
		ports: declaration.ports,
		run: declaration.run,
		watch: declaration.watch,
	};
}
