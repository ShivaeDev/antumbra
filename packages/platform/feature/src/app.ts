import type { FeatureShape } from "#feature.ts";
export interface AppDefinition<Features extends readonly FeatureShape[] = readonly FeatureShape[]> {
	readonly features: Features;
}
