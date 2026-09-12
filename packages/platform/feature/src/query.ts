import type { Effect, Schema } from "effect";
import type { Fields, Values } from "#fields.ts";
import type { ReadHandles } from "#handles.ts";
import type { PortRecord, PortShape } from "#port.ts";
import type { RowShape } from "#row.ts";

export interface QueryShape {
	readonly name: string;
	readonly input: Fields;
	readonly output: Schema.Top;
	readonly reads: readonly RowShape[];
	readonly ports: readonly PortShape[];
	readonly scope: ((input: never) => string) | undefined;
	readonly run: (input: never, rows: never, ports: never) => Effect.Effect<unknown, unknown>;
}

export type QueryBody<Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[], Ports extends readonly PortShape[]> = (
	input: Values<Input>,
	rows: ReadHandles<Reads>,
	ports: PortRecord<Ports>,
) => Effect.Effect<Output["Type"]>;

export interface QueryDefinition<
	Name extends string,
	Input extends Fields,
	Output extends Schema.Top,
	Reads extends readonly RowShape[],
	Ports extends readonly PortShape[] = readonly [],
> extends QueryShape {
	readonly name: Name;
	readonly input: Input;
	readonly output: Output;
	readonly reads: Reads;
	readonly ports: Ports;
	readonly scope: ((input: Values<Input>) => string) | undefined;
	readonly run: QueryBody<Input, Output, Reads, Ports>;
}

interface Reading<Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]> {
	readonly input: Input;
	readonly output: Output;
	readonly reads: Reads;
	readonly scope?: (input: Values<Input>) => string;
}

interface Declaration<Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]> extends Reading<Input, Output, Reads> {
	readonly run: (input: Values<Input>, rows: ReadHandles<Reads>) => Effect.Effect<Output["Type"]>;
}

interface Ported<Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[], Ports extends readonly PortShape[]>
	extends Reading<Input, Output, Reads> {
	readonly ports: Ports;
	readonly run: QueryBody<Input, Output, Reads, NoInfer<Ports>>;
}

export function query<
	Name extends string,
	const Input extends Fields,
	Output extends Schema.Top,
	const Reads extends readonly RowShape[],
	const Ports extends readonly PortShape[],
>(name: Name, declaration: Ported<Input, Output, Reads, Ports>): QueryDefinition<Name, Input, Output, Reads, Ports>;
export function query<Name extends string, const Input extends Fields, Output extends Schema.Top, const Reads extends readonly RowShape[]>(
	name: Name,
	declaration: Declaration<Input, Output, Reads>,
): QueryDefinition<Name, Input, Output, Reads>;
export function query(
	name: string,
	declaration: Reading<Fields, Schema.Top, readonly RowShape[]> & {
		readonly ports?: readonly PortShape[];
		readonly run: (input: never, rows: never, ports: never) => Effect.Effect<unknown, unknown>;
	},
): QueryShape {
	return {
		input: declaration.input,
		name,
		output: declaration.output,
		ports: declaration.ports ?? [],
		reads: declaration.reads,
		run: declaration.run,
		scope: declaration.scope,
	};
}
