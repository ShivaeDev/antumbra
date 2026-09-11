import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Effect } from "effect";
import { codecFor, type RowCodec } from "#codec.ts";
import { shapeOf } from "#table.ts";

export interface AppDefinition<Features extends readonly FeatureShape[] = readonly FeatureShape[]> {
	readonly features: Features;
}

export interface RunnableMaterializer {
	readonly run: (fact: Record<string, unknown>, rows: Record<string, unknown>) => Effect.Effect<void, unknown>;
	readonly writes: readonly RowShape[];
}

export interface Registry {
	readonly codecs: ReadonlyMap<string, RowCodec>;
	readonly materializers: ReadonlyMap<string, RunnableMaterializer>;
	readonly rows: readonly RowShape[];
}

export const app = <const Features extends readonly FeatureShape[]>(features: Features): AppDefinition<Features> => ({ features });

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

export function registryOf(definition: AppDefinition): Effect.Effect<Registry>;
export function registryOf(definition: AppDefinition): unknown {
	return Effect.gen(function* () {
		const codecs = new Map<string, RowCodec>();
		const materializers = new Map<string, unknown>();
		const rowOwners = new Map<string, string>();
		const factOwners = new Map<string, string>();
		for (const feature of definition.features) {
			const clash = addRows(codecs, rowOwners, feature) ?? addMaterializers(materializers, factOwners, feature);
			if (clash !== undefined) return yield* Effect.die(new Error(clash));
		}
		return { codecs, materializers, rows: [...codecs.values()].map((codec) => codec.row) };
	});
}

export const codecOf = (registry: Registry, row: RowShape): RowCodec => {
	const codec = registry.codecs.get(row.name);
	return codec === undefined ? codecFor(row) : codec;
};
