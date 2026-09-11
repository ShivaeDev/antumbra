import type { CommandShape } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { MaterializerShape } from "#materializer.ts";
import type { QueryShape } from "#query.ts";
import type { RowShape } from "#row.ts";

type Complaint<Sentence extends string> = { readonly [Text in Sentence]: never };

type Named<Parts extends readonly { readonly name: string }[]> = Parts[number]["name"];

type MaterializersFor<Name extends string, Materializers extends readonly MaterializerShape[]> = Materializers extends readonly [
	infer Head extends MaterializerShape,
	...infer Rest extends readonly MaterializerShape[],
]
	? Head["fact"]["name"] extends Name
		? [Head, ...MaterializersFor<Name, Rest>]
		: MaterializersFor<Name, Rest>
	: [];

type FactProof<Fact extends FactShape, Found extends readonly MaterializerShape[]> = Found extends readonly [unknown]
	? Fact
	: Found extends readonly []
		? Complaint<`the fact "${Fact["name"]}" has no materializer in this feature`>
		: Complaint<`the fact "${Fact["name"]}" has more than one materializer in this feature`>;

type MaterializerRowsProof<Materializer extends MaterializerShape, Undeclared extends string> = [Undeclared] extends [never]
	? Materializer
	: Complaint<`the materializer for "${Materializer["fact"]["name"]}" writes the row "${Undeclared}", which this feature does not declare`>;

type MaterializerProof<Materializer extends MaterializerShape, Facts extends readonly FactShape[], Rows extends readonly RowShape[]> = [
	Exclude<Materializer["fact"]["name"], Named<Facts>>,
] extends [never]
	? MaterializerRowsProof<Materializer, Exclude<Named<Materializer["writes"]>, Named<Rows>>>
	: Complaint<`the materializer for "${Materializer["fact"]["name"]}" materializes a fact this feature does not declare`>;

type CommandRowsProof<Command extends CommandShape, Undeclared extends string> = [Undeclared] extends [never]
	? Command
	: Complaint<`the command "${Command["name"]}" reads the row "${Undeclared}", which this feature does not declare`>;

type CommandProof<Command extends CommandShape, Facts extends readonly FactShape[], Rows extends readonly RowShape[]> = [
	Exclude<Command["emits"]["name"], Named<Facts>>,
] extends [never]
	? CommandRowsProof<Command, Exclude<Named<Command["reads"]>, Named<Rows>>>
	: Complaint<`the command "${Command["name"]}" emits the fact "${Command["emits"]["name"]}", which this feature does not declare`>;

type QueryProof<Query extends QueryShape, Undeclared extends string> = [Undeclared] extends [never]
	? Query
	: Complaint<`the query "${Query["name"]}" reads the row "${Undeclared}", which this feature does not declare`>;

export type FactsProof<Facts extends readonly FactShape[], Materializers extends readonly MaterializerShape[]> = {
	readonly [Index in keyof Facts]: FactProof<Facts[Index], MaterializersFor<Facts[Index]["name"], Materializers>>;
};

export type MaterializersProof<
	Materializers extends readonly MaterializerShape[],
	Facts extends readonly FactShape[],
	Rows extends readonly RowShape[],
> = {
	readonly [Index in keyof Materializers]: MaterializerProof<Materializers[Index], Facts, Rows>;
};

export type CommandsProof<Commands extends readonly CommandShape[], Facts extends readonly FactShape[], Rows extends readonly RowShape[]> = {
	readonly [Index in keyof Commands]: CommandProof<Commands[Index], Facts, Rows>;
};

export type QueriesProof<Queries extends readonly QueryShape[], Rows extends readonly RowShape[]> = {
	readonly [Index in keyof Queries]: QueryProof<Queries[Index], Exclude<Named<Queries[Index]["reads"]>, Named<Rows>>>;
};
