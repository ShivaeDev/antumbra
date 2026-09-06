import type { FeatureShape, RowShape } from "@antumbra/journal";
import type { Effect } from "effect";
import { codecFor, type RowCodec } from "#codec.ts";

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

export function registryOf(definition: AppDefinition): Registry;
export function registryOf(definition: AppDefinition): unknown {
	const codecs = new Map<string, RowCodec>();
	const materializers = new Map<string, unknown>();
	for (const feature of definition.features) {
		for (const row of feature.rows) {
			if (!codecs.has(row.name)) codecs.set(row.name, codecFor(row));
		}
		for (const materializer of feature.materializers) {
			materializers.set(materializer.fact.name, materializer);
		}
	}
	return { codecs, materializers, rows: [...codecs.values()].map((codec) => codec.row) };
}

export const codecOf = (registry: Registry, row: RowShape): RowCodec => {
	const codec = registry.codecs.get(row.name);
	return codec === undefined ? codecFor(row) : codec;
};
