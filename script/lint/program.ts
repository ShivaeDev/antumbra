import { Effect } from "effect";
import type { Inventory } from "#lint/inventory.ts";
import { commentViolations } from "#lint/rules/comments.ts";
import { contractViolations } from "#lint/rules/contracts.ts";
import { documentationViolations } from "#lint/rules/documentation.ts";
import { layoutViolations } from "#lint/rules/layout.ts";
import { layoutDomainImportViolations } from "#lint/rules/layout-domain-imports.ts";
import { layoutExportsViolations } from "#lint/rules/layout-exports.ts";
import { layoutFeatureFolderViolations } from "#lint/rules/layout-feature-folders.ts";
import { layoutNodeViolations } from "#lint/rules/layout-node.ts";
import { layoutTestsViolations } from "#lint/rules/layout-tests.ts";
import { manifestViolations } from "#lint/rules/manifests.ts";
import { nestingViolations } from "#lint/rules/nesting.ts";
import { pragmaViolations } from "#lint/rules/pragmas.ts";
import { serviceDefinitionAssemblyViolations } from "#lint/rules/service-definition-assembly.ts";
import { serviceParameterViolations } from "#lint/rules/service-parameters.ts";
import { structureViolations } from "#lint/rules/structure.ts";
import { testPatternViolations } from "#lint/rules/test-patterns.ts";
import type { Violation } from "#lint/violation.ts";

export const lint = (inventory: Inventory): Effect.Effect<readonly Violation[]> =>
	Effect.map(
		Effect.all(
			[
				Effect.sync(() => documentationViolations(inventory.documents)),
				Effect.sync(() => structureViolations(inventory)),
				Effect.sync(() => layoutViolations(inventory)),
				Effect.sync(() => layoutExportsViolations(inventory)),
				Effect.sync(() => layoutFeatureFolderViolations(inventory)),
				Effect.sync(() => layoutDomainImportViolations(inventory)),
				Effect.sync(() => layoutNodeViolations(inventory)),
				Effect.sync(() => layoutTestsViolations(inventory)),
				Effect.sync(() => testPatternViolations(inventory)),
				Effect.sync(() => nestingViolations(inventory)),
				Effect.sync(() => commentViolations(inventory)),
				Effect.sync(() => pragmaViolations(inventory)),
				Effect.sync(() => manifestViolations(inventory)),
				Effect.sync(() => serviceDefinitionAssemblyViolations(inventory)),
				Effect.sync(() => serviceParameterViolations(inventory)),
				contractViolations(inventory),
			],
			{ concurrency: "unbounded" },
		),
		(results) => results.flat(),
	);
