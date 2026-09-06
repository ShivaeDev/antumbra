import type { BoundaryRule } from "#boundaries/model.ts";
import { ownershipPolicy } from "#boundaries/policy/ownership.ts";
import { vocabularyPolicy } from "#boundaries/policy/vocabulary.ts";

export const boundaryPolicy = [...vocabularyPolicy, ...ownershipPolicy] as const satisfies readonly BoundaryRule[];
