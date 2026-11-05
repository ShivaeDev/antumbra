import type { CommandShape } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { QueryShape } from "#query.ts";
import type { RowShape } from "#row.ts";

type Complaint<Sentence extends string> = { readonly [Text in Sentence]: never };
type Named<Parts extends readonly { readonly name: string }[]> = Parts[number]["name"];
type CommandRowsProof<Command extends CommandShape, Undeclared extends string> = [Undeclared] extends [never]
	? Command
	: Complaint<`the command "${Command["name"]}" reads the row "${Undeclared}", which this feature does not declare`>;
type CommandProof<Command extends CommandShape, Facts extends readonly FactShape[], Rows extends readonly RowShape[]> = [
	Exclude<Command["emits"]["name"], Named<Facts>>,
] extends [never]
	? CommandRowsProof<Command, Exclude<Named<Command["reads"]>, Named<Rows>>>
	: Complaint<`the command "${Command["name"]}" emits the fact "${Command["emits"]["name"]}", which this feature does not declare`>;
export type CommandsProof<Commands extends readonly CommandShape[], Facts extends readonly FactShape[], Rows extends readonly RowShape[]> = {
	readonly [Index in keyof Commands]: CommandProof<Commands[Index], Facts, Rows>;
};
export type QueriesProof<Queries extends readonly QueryShape[], Rows extends readonly RowShape[]> = {
	readonly [Index in keyof Queries]: [Exclude<Named<Queries[Index]["reads"]>, Named<Rows>>] extends [never]
		? Queries[Index]
		: Complaint<`the query "${Queries[Index]["name"]}" reads the row "${Exclude<Named<Queries[Index]["reads"]>, Named<Rows>>}", which this feature does not declare`>;
};
