import { compileBoundaryPolicy } from "#boundaries/compiler.ts";
import { boundaryPolicy } from "#boundaries/policy.ts";

export const compiledBoundaryPolicy = compileBoundaryPolicy(boundaryPolicy);
export const dependencyCruiserConfig = compiledBoundaryPolicy.configuration;
