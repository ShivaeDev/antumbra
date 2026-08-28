import type { BoundaryRule } from "#boundaries/model.ts";
import { vocabularyCapabilityPolicy } from "#boundaries/policy/vocabulary-capabilities.ts";
import { vocabularySurfacePolicy } from "#boundaries/policy/vocabulary-surfaces.ts";

export const vocabularyPolicy = [
	...vocabularyCapabilityPolicy,
	...vocabularySurfacePolicy,
] as const satisfies readonly BoundaryRule[];
