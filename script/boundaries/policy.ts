import type { BoundaryRule } from "#boundaries/model.ts";
import { adapterPolicy } from "#boundaries/policy/adapters.ts";
import { hostPolicy } from "#boundaries/policy/host.ts";
import { ownershipPolicy } from "#boundaries/policy/ownership.ts";
import { presentationPolicy } from "#boundaries/policy/presentation.ts";
import { surfacePolicy } from "#boundaries/policy/surfaces.ts";
import { vocabularyPolicy } from "#boundaries/policy/vocabulary.ts";

export const boundaryPolicy = [
	...vocabularyPolicy,
	...hostPolicy,
	...adapterPolicy,
	...presentationPolicy,
	...surfacePolicy,
	...ownershipPolicy,
] as const satisfies readonly BoundaryRule[];
