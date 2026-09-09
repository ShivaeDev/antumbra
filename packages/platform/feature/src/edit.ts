import { Schema } from "effect";
import type { QueryShape } from "#query.ts";

const CHOICE = "antumbra/choice";
const OPTIONAL = "antumbra/optional";

type Listed<Query extends QueryShape> = Query["output"]["Type"] extends readonly (infer Element)[] ? Element : never;

type Named<Query extends QueryShape> = keyof Listed<Query> & string;

export interface ChoiceOf<Query extends QueryShape> {
	readonly free?: boolean;
	readonly input: Readonly<Record<keyof Query["input"] & string, string>>;
	readonly label?: Named<Query>;
	readonly value?: Named<Query>;
}

export interface Choice {
	readonly free: boolean;
	readonly input: Readonly<Record<string, string>>;
	readonly label: string | undefined;
	readonly query: QueryShape;
	readonly value: string | undefined;
}

export interface Editing {
	readonly choice: Choice | undefined;
	readonly flag: boolean;
	readonly inner: Schema.Top;
	readonly literals: readonly string[] | undefined;
	readonly optional: boolean;
	readonly title: string | undefined;
}

interface Shaped {
	readonly literals?: readonly unknown[];
	readonly members?: readonly Schema.Top[];
}

function topped(schema: Schema.Constraint): Schema.Top;
function topped(schema: unknown): unknown {
	return schema;
}

function shaped(schema: Schema.Constraint): Shaped;
function shaped(schema: unknown): unknown {
	return schema;
}

function chosen(annotation: unknown): Choice | undefined;
function chosen(annotation: unknown): unknown {
	return annotation;
}

export const choice = <Query extends QueryShape>(query: Query, of: ChoiceOf<Query>): typeof Schema.String =>
	Schema.String.annotate({
		[CHOICE]: { free: of.free === true, input: of.input, label: of.label, query, value: of.value },
	});

export const optional = <S extends Schema.Constraint>(schema: S, options: { readonly title: string }): Schema.NullOr<S> =>
	Schema.NullOr(schema).annotate({ [OPTIONAL]: true, title: options.title });

const wordsOf = (literals: readonly unknown[] | undefined): readonly string[] | undefined => {
	if (literals === undefined) {
		return undefined;
	}
	const words: string[] = [];
	for (const literal of literals) {
		if (typeof literal !== "string") {
			return undefined;
		}
		words.push(literal);
	}
	return words;
};

export const editing = (field: Schema.Constraint): Editing => {
	const outer = Schema.resolveAnnotations(field);
	const optionally = outer?.[OPTIONAL] === true;
	const inner = optionally ? (shaped(field).members?.[0] ?? topped(field)) : topped(field);
	const annotations = optionally ? Schema.resolveAnnotations(inner) : outer;
	return {
		choice: chosen(annotations?.[CHOICE]),
		flag: inner.ast._tag === "Boolean",
		inner,
		literals: wordsOf(shaped(inner).literals),
		optional: optionally,
		title: outer?.title,
	};
};
