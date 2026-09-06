import type { CommandShape } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { MaterializerShape } from "#materializer.ts";
import type { QueryShape } from "#query.ts";
import type { RowShape } from "#row.ts";

interface FactNeedsExactlyOneMaterializer {
	readonly _featureError: "every fact needs exactly one materializer in this feature";
}

interface MaterializesAnUndeclaredFact {
	readonly _featureError: "the materialized fact is not declared in this feature's facts";
}

interface EmitsAnUndeclaredFact {
	readonly _featureError: "the emitted fact is not declared in this feature's facts";
}

interface TouchesAnUndeclaredRow {
	readonly _featureError: "a row that is read or written is not declared in this feature's rows";
}

type Named<Parts extends readonly { readonly name: string }[]> = Parts[number]["name"];

type Declared<Used extends string, Names extends string> = [Exclude<Used, Names>] extends [never] ? true : false;

type MaterializersFor<Name extends string, Materializers extends readonly MaterializerShape[]> = Materializers extends readonly [
	infer Head extends MaterializerShape,
	...infer Rest extends readonly MaterializerShape[],
]
	? Head["fact"]["name"] extends Name
		? [Head, ...MaterializersFor<Name, Rest>]
		: MaterializersFor<Name, Rest>
	: [];

export type FactsProof<Facts extends readonly FactShape[], Materializers extends readonly MaterializerShape[]> = {
	readonly [Index in keyof Facts]: MaterializersFor<Facts[Index]["name"], Materializers> extends readonly [unknown]
		? Facts[Index]
		: FactNeedsExactlyOneMaterializer;
};

export type MaterializersProof<
	Materializers extends readonly MaterializerShape[],
	Facts extends readonly FactShape[],
	Rows extends readonly RowShape[],
> = {
	readonly [Index in keyof Materializers]: Declared<Materializers[Index]["fact"]["name"], Named<Facts>> extends true
		? Declared<Named<Materializers[Index]["writes"]>, Named<Rows>> extends true
			? Materializers[Index]
			: TouchesAnUndeclaredRow
		: MaterializesAnUndeclaredFact;
};

export type CommandsProof<Commands extends readonly CommandShape[], Facts extends readonly FactShape[], Rows extends readonly RowShape[]> = {
	readonly [Index in keyof Commands]: Declared<Commands[Index]["emits"]["name"], Named<Facts>> extends true
		? Declared<Named<Commands[Index]["reads"]>, Named<Rows>> extends true
			? Commands[Index]
			: TouchesAnUndeclaredRow
		: EmitsAnUndeclaredFact;
};

export type QueriesProof<Queries extends readonly QueryShape[], Rows extends readonly RowShape[]> = {
	readonly [Index in keyof Queries]: Declared<Named<Queries[Index]["reads"]>, Named<Rows>> extends true ? Queries[Index] : TouchesAnUndeclaredRow;
};
