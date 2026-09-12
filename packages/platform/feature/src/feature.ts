import type { CommandShape } from "#command.ts";
import type { FactShape } from "#fact.ts";
import type { MaterializerShape } from "#materializer.ts";
import type { MigrationShape } from "#migration.ts";
import type { PortServices, PortShape } from "#port.ts";
import type { CommandsProof, FactsProof, MaterializersProof, QueriesProof, ReconcilersProof } from "#proof.ts";
import type { QueryShape } from "#query.ts";
import type { ReconcilerShape } from "#reconciler.ts";
import type { RowShape } from "#row.ts";

export interface FeatureShape {
	readonly name: string;
	readonly rows: readonly RowShape[];
	readonly facts: readonly FactShape[];
	readonly migrations: readonly MigrationShape[];
	readonly commands: readonly CommandShape[];
	readonly materializers: readonly MaterializerShape[];
	readonly queries: readonly QueryShape[];
	readonly ports: readonly PortShape[];
	readonly reconcilers: readonly ReconcilerShape[];
}

export type FeaturePorts<Features extends readonly FeatureShape[]> = PortServices<Features[number]["ports"]>;

export interface FeatureDefinition<
	Name extends string,
	Rows extends readonly RowShape[],
	Facts extends readonly FactShape[],
	Commands extends readonly CommandShape[],
	Materializers extends readonly MaterializerShape[],
	Queries extends readonly QueryShape[],
	Ports extends readonly PortShape[],
	Reconcilers extends readonly ReconcilerShape[],
> extends FeatureShape {
	readonly name: Name;
	readonly rows: Rows;
	readonly facts: Facts;
	readonly commands: Commands;
	readonly materializers: Materializers;
	readonly queries: Queries;
	readonly ports: Ports;
	readonly reconcilers: Reconcilers;
}

export function feature<
	Name extends string,
	const Rows extends readonly RowShape[],
	const Facts extends readonly FactShape[],
	const Commands extends readonly CommandShape[],
	const Materializers extends readonly MaterializerShape[],
	const Queries extends readonly QueryShape[],
	const Ports extends readonly PortShape[] = readonly [],
	const Reconcilers extends readonly ReconcilerShape[] = readonly [],
>(
	name: Name,
	parts: {
		readonly rows: Rows;
		readonly facts: Facts & FactsProof<NoInfer<Facts>, NoInfer<Materializers>>;
		readonly migrations?: readonly MigrationShape[];
		readonly commands: Commands & CommandsProof<NoInfer<Commands>, NoInfer<Facts>, NoInfer<Rows>>;
		readonly materializers: Materializers & MaterializersProof<NoInfer<Materializers>, NoInfer<Facts>, NoInfer<Rows>>;
		readonly queries: Queries & QueriesProof<NoInfer<Queries>, NoInfer<Rows>, NoInfer<Ports>>;
		readonly ports?: Ports;
		readonly reconcilers?: Reconcilers & ReconcilersProof<NoInfer<Reconcilers>, NoInfer<Ports>>;
	},
): FeatureDefinition<Name, Rows, Facts, Commands, Materializers, Queries, Ports, Reconcilers>;
export function feature(
	name: string,
	parts: Omit<FeatureShape, "name" | "migrations" | "ports" | "reconcilers"> & Partial<Pick<FeatureShape, "migrations" | "ports" | "reconcilers">>,
): FeatureShape {
	return {
		commands: parts.commands,
		facts: parts.facts,
		materializers: parts.materializers,
		migrations: parts.migrations ?? [],
		name,
		ports: parts.ports ?? [],
		queries: parts.queries,
		reconcilers: parts.reconcilers ?? [],
		rows: parts.rows,
	};
}
