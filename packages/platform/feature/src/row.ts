import { Schema } from "effect";
import type { Fields } from "#fields.ts";

export interface RowShape {
	readonly name: string;
	readonly Row: Schema.ConstraintCodec<unknown, Record<string, unknown>>;
	readonly fields: Fields;
	readonly key: string;
	readonly scope: string | undefined;
}

export interface RowDefinition<Name extends string, Of extends Fields, Key extends keyof Of & string, Scope extends (keyof Of & string) | undefined>
	extends RowShape {
	readonly name: Name;
	readonly Row: Schema.Struct<Of>;
	readonly fields: Of;
	readonly key: Key;
	readonly scope: Scope;
}

export type RowValue<Row extends RowShape> = Row["Row"]["Type"];

export type RowKey<Row extends RowShape> = RowValue<Row>[Row["key"] & keyof RowValue<Row>];

export function row<Name extends string, const Of extends Fields, Key extends keyof Of & string, Scope extends keyof Of & string>(
	name: Name,
	fields: Of,
	options: { readonly key: Key; readonly scope: Scope },
): RowDefinition<Name, Of, Key, Scope>;
export function row<Name extends string, const Of extends Fields, Key extends keyof Of & string>(
	name: Name,
	fields: Of,
	options: { readonly key: Key },
): RowDefinition<Name, Of, Key, undefined>;
export function row(name: string, fields: Fields, options: { readonly key: string; readonly scope?: string }): unknown {
	return { fields, key: options.key, name, Row: Schema.Struct(fields), scope: options.scope };
}
