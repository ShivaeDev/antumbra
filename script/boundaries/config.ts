import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBoundaryPolicy } from "#boundaries/compiler.ts";
import { boundaryPolicy } from "#boundaries/policy.ts";
import { collectBoundaryPolicyInventory } from "#boundaries/workspace-inventory.ts";

const repositoryRoot = dirname(
	dirname(dirname(fileURLToPath(import.meta.url))),
);
export const boundaryPolicyInventory =
	collectBoundaryPolicyInventory(repositoryRoot);
export const compiledBoundaryPolicy = compileBoundaryPolicy(
	boundaryPolicy,
	boundaryPolicyInventory,
);
export const dependencyCruiserConfig = compiledBoundaryPolicy.configuration;
