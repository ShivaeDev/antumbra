import type { CommandShape } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { CommandsProof, QueriesProof } from "#proof.ts";
import type { QueryShape } from "#query.ts";
import type { RowShape } from "#row.ts";

export interface FeatureShape {
	readonly name: string;
	readonly rows: readonly RowShape[];
	readonly facts: readonly FactShape[];
	readonly commands: readonly CommandShape[];
	readonly queries: readonly QueryShape[];
}
export interface FeatureDefinition<
	Name extends string,
	Rows extends readonly RowShape[],
	Facts extends readonly FactShape[],
	Commands extends readonly CommandShape[],
	Queries extends readonly QueryShape[],
> extends FeatureShape {
	readonly name: Name;
	readonly rows: Rows;
	readonly facts: Facts;
	readonly commands: Commands;
	readonly queries: Queries;
}
export function feature<
	Name extends string,
	const Rows extends readonly RowShape[],
	const Facts extends readonly FactShape[],
	const Commands extends readonly CommandShape[],
	const Queries extends readonly QueryShape[],
>(
	name: Name,
	parts: {
		readonly rows: Rows;
		readonly facts: Facts;
		readonly commands: Commands & CommandsProof<NoInfer<Commands>, NoInfer<Facts>, NoInfer<Rows>>;
		readonly queries: Queries & QueriesProof<NoInfer<Queries>, NoInfer<Rows>>;
	},
): FeatureDefinition<Name, Rows, Facts, Commands, Queries>;
export function feature(name: string, parts: Omit<FeatureShape, "name">): FeatureShape {
	return { name, ...parts };
}
