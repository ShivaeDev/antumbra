import type { DistinctNames, FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { MigrationBody } from "@antumbra/platform-feature/migration.ts";
import type { ProjectionShape } from "@antumbra/platform-feature/projection.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Effect, type Schema } from "effect";
import { codecFor, type RowCodec } from "#codec.ts";
import { shapeOf } from "#table.ts";

export interface AppDefinition<Features extends readonly FeatureShape[] = readonly FeatureShape[]> {
	readonly features: Features;
	readonly projections: readonly ProjectionShape[];
}

export interface RunnableMaterializer {
	readonly fact: { readonly Payload: Schema.ConstraintCodec<Record<string, unknown>, unknown> };
	readonly run: (fact: Record<string, unknown>, rows: Record<string, unknown>) => Effect.Effect<void, unknown>;
	readonly writes: readonly RowShape[];
}

export interface RunnableMigration {
	readonly feature: string;
	readonly number: number;
	readonly fact: string;
	readonly rewrite: MigrationBody;
}

export interface RunnableProjection {
	readonly reads: readonly RowShape[];
	readonly writes: readonly RowShape[];
	readonly run: (reads: Record<string, unknown>, writes: Record<string, unknown>) => Effect.Effect<void>;
}

export interface Registry {
	readonly projections: readonly RunnableProjection[];
	readonly codecs: ReadonlyMap<string, RowCodec>;
	readonly materializers: ReadonlyMap<string, RunnableMaterializer>;
	readonly migrations: readonly RunnableMigration[];
	readonly rows: readonly RowShape[];
}

export const app = <const Features extends readonly FeatureShape[]>(
	features: Features & DistinctNames<NoInfer<Features>>,
	projections: readonly ProjectionShape[] = [],
): AppDefinition<Features> => ({ features, projections });

const addRows = (codecs: Map<string, RowCodec>, owners: Map<string, string>, feature: FeatureShape): string | undefined => {
	for (const row of feature.rows) {
		const known = codecs.get(row.name);
		if (known === undefined) {
			codecs.set(row.name, codecFor(row));
			owners.set(row.name, feature.name);
		} else if (shapeOf(known.row) !== shapeOf(row)) {
			return `features "${owners.get(row.name)}" and "${feature.name}" declare the row "${row.name}" with different shapes`;
		}
	}
	return undefined;
};

const addMaterializers = (materializers: Map<string, unknown>, owners: Map<string, string>, feature: FeatureShape): string | undefined => {
	for (const materializer of feature.materializers) {
		const owner = owners.get(materializer.fact.name);
		if (owner !== undefined) {
			return `features "${owner}" and "${feature.name}" both declare the fact "${materializer.fact.name}"`;
		}
		owners.set(materializer.fact.name, feature.name);
		materializers.set(materializer.fact.name, materializer);
	}
	return undefined;
};

const addMigrations = (migrations: RunnableMigration[], feature: FeatureShape): string | undefined => {
	const declared: number[] = [];
	const contiguous: number[] = [];
	for (const migration of feature.migrations) {
		declared.push(migration.number);
		contiguous.push(contiguous.length + 1);
		migrations.push({ fact: migration.fact, feature: feature.name, number: migration.number, rewrite: migration.rewrite });
	}
	if (declared.join(", ") === contiguous.join(", ")) return undefined;
	return `the feature "${feature.name}" declares fact migrations numbered ${declared.join(", ")}; they must be numbered ${contiguous.join(", ")}`;
};

export function registryOf(definition: AppDefinition): Effect.Effect<Registry>;
export function registryOf(definition: AppDefinition): unknown {
	return Effect.gen(function* () {
		const codecs = new Map<string, RowCodec>();
		const materializers = new Map<string, unknown>();
		const migrations: RunnableMigration[] = [];
		const rowOwners = new Map<string, string>();
		const factOwners = new Map<string, string>();
		for (const feature of definition.features) {
			const clash = addRows(codecs, rowOwners, feature) ?? addMaterializers(materializers, factOwners, feature) ?? addMigrations(migrations, feature);
			if (clash !== undefined) return yield* Effect.die(new Error(clash));
		}
		const projections: readonly unknown[] = definition.projections;
		return { codecs, materializers, migrations, projections, rows: [...codecs.values()].map((codec) => codec.row) };
	});
}

export const codecOf = (registry: Registry, row: RowShape): RowCodec => {
	const codec = registry.codecs.get(row.name);
	return codec === undefined ? codecFor(row) : codec;
};
