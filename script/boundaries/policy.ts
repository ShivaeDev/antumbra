import type { BoundaryRule } from "#boundaries/model.ts";
import { ownershipPolicy } from "#boundaries/policy/ownership.ts";

export const boundaryPolicy = ownershipPolicy satisfies readonly BoundaryRule[];
