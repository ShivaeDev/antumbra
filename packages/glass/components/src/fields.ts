import { emptyAsNull } from "@antumbra/glass-form/optional.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import { type Editing, editing } from "@antumbra/platform-feature/edit.ts";
import { Schema } from "effect";

export type Held = Readonly<Record<string, unknown>>;

type Field = Schema.ConstraintCodec<unknown, unknown>;

type Drawn = { readonly [name: string]: Field };

function fieldOf(schema: Schema.Top): Field;
function fieldOf(schema: unknown): unknown {
	return schema;
}

export interface Editable {
	readonly editing: Editing;
	readonly name: string;
}

export type Fixed = readonly string[] | Held;

function listed(fixed: Fixed): readonly string[] | undefined;
function listed(fixed: unknown): unknown {
	return Array.isArray(fixed) ? fixed : undefined;
}

function record(fixed: Fixed): Held;
function record(fixed: unknown): unknown {
	return fixed;
}

export const fixedNames = (fixed: Fixed): readonly string[] => listed(fixed) ?? Object.keys(record(fixed));

export const fixedValues = (fixed: Fixed): Held => (listed(fixed) === undefined ? record(fixed) : {});

const drawn = (shape: Editing): boolean => shape.choice !== undefined || shape.title !== undefined;

export const editablesOf = (command: CommandShape, fixed: readonly string[]): readonly Editable[] => {
	const editables: Editable[] = [];
	for (const [name, field] of Object.entries(command.input)) {
		const shape = editing(field);
		if (drawn(shape) && !fixed.includes(name)) {
			editables.push({ editing: shape, name });
		}
	}
	return editables;
};

export const schemaOf = (editables: readonly Editable[]): Schema.Struct<Drawn> => {
	const fields: Record<string, Field> = {};
	for (const editable of editables) {
		fields[editable.name] = fieldOf(editable.editing.optional ? emptyAsNull(editable.editing.inner) : editable.editing.inner);
	}
	return Schema.Struct(fields);
};

const NOTHING: readonly string[] = [];

export const emptyOf = (shape: Editing): unknown => {
	if (shape.many) {
		return NOTHING;
	}
	if (shape.flag) {
		return false;
	}
	return shape.optional || shape.literals === undefined ? "" : (shape.literals[0] ?? "");
};

export const valuesOf = (editables: readonly Editable[], row: Held): Held => {
	const values: Record<string, unknown> = {};
	for (const editable of editables) {
		const held = row[editable.name];
		values[editable.name] = held ?? emptyOf(editable.editing);
	}
	return values;
};

export const identityOf = (command: CommandShape, row: Held): Held => {
	const held: Record<string, unknown> = {};
	for (const name of Object.keys(command.input)) {
		if (name in row) {
			held[name] = row[name];
		}
	}
	return held;
};

export const titleOf = (editable: Editable): string => editable.editing.title ?? capitalised(editable.name);

export const capitalised = (word: string): string => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;

export const labelOf = (fixed: readonly string[], row: Held): string => {
	const words: string[] = [];
	for (const name of fixed) {
		const held = row[name];
		if (typeof held === "string") {
			words.push(capitalised(held));
		}
	}
	return words.join(" ");
};

export const signatureOf = (editables: readonly Editable[], row: Held): string => JSON.stringify(editables.map(({ name }) => row[name] ?? null));

export const fedByOf = (editables: readonly Editable[]): ReadonlyMap<string, readonly Editable[]> => {
	const fed = new Map<string, Editable[]>();
	for (const editable of editables) {
		for (const feeder of Object.values(editable.editing.choice?.input ?? {})) {
			const known = fed.get(feeder) ?? [];
			known.push(editable);
			fed.set(feeder, known);
		}
	}
	return fed;
};
