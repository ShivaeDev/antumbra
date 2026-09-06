import type { Effect, Schema } from "effect";
import type { Fields, Values } from "#fields.ts";
import type { ReadHandles } from "#handles.ts";
import type { RowShape } from "#row.ts";

export interface QueryShape {
	readonly name: string;
	readonly input: Fields;
	readonly output: Schema.Top;
	readonly reads: readonly RowShape[];
	readonly scope: ((input: never) => string) | undefined;
	readonly run: (input: never, rows: never) => Effect.Effect<unknown, unknown>;
}

export type QueryBody<Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]> = (
	input: Values<Input>,
	rows: ReadHandles<Reads>,
) => Effect.Effect<Output["Type"]>;

export interface QueryDefinition<Name extends string, Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]>
	extends QueryShape {
	readonly name: Name;
	readonly input: Input;
	readonly output: Output;
	readonly reads: Reads;
	readonly scope: ((input: Values<Input>) => string) | undefined;
	readonly run: QueryBody<Input, Output, Reads>;
}

interface Declaration<Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]> {
	readonly input: Input;
	readonly output: Output;
	readonly reads: Reads;
	readonly run: QueryBody<Input, Output, Reads>;
}

export function query<Name extends string, const Input extends Fields, Output extends Schema.Top, const Reads extends readonly RowShape[]>(
	name: Name,
	declaration: Declaration<Input, Output, Reads> & { readonly scope: (input: Values<Input>) => string },
): QueryDefinition<Name, Input, Output, Reads>;
export function query<Name extends string, const Input extends Fields, Output extends Schema.Top, const Reads extends readonly RowShape[]>(
	name: Name,
	declaration: Declaration<Input, Output, Reads>,
): QueryDefinition<Name, Input, Output, Reads>;
export function query(
	name: string,
	declaration: Declaration<Fields, Schema.Top, readonly RowShape[]> & { readonly scope?: (input: never) => string },
): QueryShape {
	return { input: declaration.input, name, output: declaration.output, reads: declaration.reads, run: declaration.run, scope: declaration.scope };
}
