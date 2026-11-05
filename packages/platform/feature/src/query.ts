import type { Schema } from "effect";
import type { Fields, Values } from "#fields.ts";
import type { RowShape } from "#row.ts";

export interface QueryShape {
	readonly name: string;
	readonly input: Fields;
	readonly output: Schema.Top;
	readonly reads: readonly RowShape[];
	readonly scope: ((input: never) => string) | undefined;
}
export interface QueryDefinition<Name extends string, Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]>
	extends QueryShape {
	readonly name: Name;
	readonly input: Input;
	readonly output: Output;
	readonly reads: Reads;
	readonly scope: ((input: Values<Input>) => string) | undefined;
}
export const query = <Name extends string, const Input extends Fields, Output extends Schema.Top, const Reads extends readonly RowShape[]>(
	name: Name,
	declaration: { readonly input: Input; readonly output: Output; readonly reads: Reads; readonly scope?: (input: Values<Input>) => string },
): QueryDefinition<Name, Input, Output, Reads> => ({ name, ...declaration, scope: declaration.scope });
