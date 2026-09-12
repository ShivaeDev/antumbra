import type { CommandShape } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { MaterializerShape } from "#materializer.ts";
import type { MigrationShape } from "#migration.ts";
import type { CommandsProof, FactsProof, MaterializersProof, QueriesProof } from "#proof.ts";
import type { QueryShape } from "#query.ts";
import type { RowShape } from "#row.ts";

export interface FeatureShape {
	readonly name: string;
	readonly rows: readonly RowShape[];
	readonly facts: readonly FactShape[];
	readonly migrations: readonly MigrationShape[];
	readonly commands: readonly CommandShape[];
	readonly materializers: readonly MaterializerShape[];
	readonly queries: readonly QueryShape[];
}

type OtherNames<Features extends readonly FeatureShape[], Index> = {
	[Other in keyof Features]: Other extends Index ? never : Features[Other]["name"];
}[number];

type Twice<Features extends readonly FeatureShape[]> = {
	[Index in keyof Features]: Features[Index]["name"] extends OtherNames<Features, Index> ? Features[Index]["name"] : never;
}[number];

export type DistinctNames<Features extends readonly FeatureShape[]> = [Twice<Features>] extends [never]
	? unknown
	: { readonly "two features carry this name": Twice<Features> };

export interface FeatureDefinition<
	Name extends string,
	Rows extends readonly RowShape[],
	Facts extends readonly FactShape[],
	Commands extends readonly CommandShape[],
	Materializers extends readonly MaterializerShape[],
	Queries extends readonly QueryShape[],
> extends FeatureShape {
	readonly name: Name;
	readonly rows: Rows;
	readonly facts: Facts;
	readonly commands: Commands;
	readonly materializers: Materializers;
	readonly queries: Queries;
}

export function feature<
	Name extends string,
	const Rows extends readonly RowShape[],
	const Facts extends readonly FactShape[],
	const Commands extends readonly CommandShape[],
	const Materializers extends readonly MaterializerShape[],
	const Queries extends readonly QueryShape[],
>(
	name: Name,
	parts: {
		readonly rows: Rows;
		readonly facts: Facts & FactsProof<NoInfer<Facts>, NoInfer<Materializers>>;
		readonly migrations?: readonly MigrationShape[];
		readonly commands: Commands & CommandsProof<NoInfer<Commands>, NoInfer<Facts>, NoInfer<Rows>>;
		readonly materializers: Materializers & MaterializersProof<NoInfer<Materializers>, NoInfer<Facts>, NoInfer<Rows>>;
		readonly queries: Queries & QueriesProof<NoInfer<Queries>, NoInfer<Rows>>;
	},
): FeatureDefinition<Name, Rows, Facts, Commands, Materializers, Queries>;
export function feature(name: string, parts: Omit<FeatureShape, "name" | "migrations"> & Partial<Pick<FeatureShape, "migrations">>): FeatureShape {
	return {
		commands: parts.commands,
		facts: parts.facts,
		materializers: parts.materializers,
		migrations: parts.migrations ?? [],
		name,
		queries: parts.queries,
		rows: parts.rows,
	};
}
