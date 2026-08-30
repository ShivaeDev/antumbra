import { type Option, Schema } from "effect";

// why: a setting holds one of a small closed set of values at every crossing —
// the JSON text in its row, the payload of a change, the field a view draws.
// Declaring that set once here is what lets a single decode stand at each of
// those boundaries instead of one per crossing.
export const SettingValue = Schema.Union([Schema.Boolean, Schema.Number]);
export type SettingValue = typeof SettingValue.Type;

type Decode = (input: unknown) => Option.Option<SettingValue>;

export interface SettingCount {
	readonly decode: Decode;
	readonly description: string;
	readonly expects: string;
	readonly fallback: number;
	readonly kind: "count";
	readonly least: number;
	readonly most: number;
	readonly title: string;
	readonly value: Schema.Codec<number>;
}

export interface SettingFlag {
	readonly decode: Decode;
	readonly description: string;
	readonly expects: string;
	readonly fallback: boolean;
	readonly kind: "flag";
	readonly title: string;
	readonly value: Schema.Codec<boolean>;
}

export type SettingDeclaration = SettingCount | SettingFlag;

// why: the kind, the schema and the control a surface draws are minted
// together and never passed in, so a declaration cannot promise a boolean and
// then ask for a number field. Declaring a setting is choosing one of these
// two constructors, which is the whole vocabulary of what a setting may be.
export const flag = (entry: { readonly description: string; readonly fallback: boolean; readonly title: string }): SettingFlag => ({
	...entry,
	decode: Schema.decodeUnknownOption(Schema.Boolean),
	expects: "true or false",
	kind: "flag",
	value: Schema.Boolean,
});

export const count = (entry: {
	readonly description: string;
	readonly fallback: number;
	readonly least: number;
	readonly most: number;
	readonly title: string;
}): SettingCount => {
	const value = Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(entry.least), Schema.isLessThanOrEqualTo(entry.most));
	return {
		...entry,
		decode: Schema.decodeUnknownOption(value),
		expects: `a whole number from ${entry.least} to ${entry.most}`,
		kind: "count",
		value,
	};
};
