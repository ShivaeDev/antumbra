import { Effect } from "effect";
import type { Inventory } from "#lint/inventory.ts";
import { commentViolations } from "#lint/rules/comments.ts";
import { contractViolations } from "#lint/rules/contracts.ts";
import { manifestViolations } from "#lint/rules/manifests.ts";
import { nestingViolations } from "#lint/rules/nesting.ts";
import { pragmaViolations } from "#lint/rules/pragmas.ts";
import { structureViolations } from "#lint/rules/structure.ts";
import type { Violation } from "#lint/violation.ts";

// why: the lints share one file inventory and never depend on each other, so
// they run concurrently and merge into a single report rather than short-
// circuiting the run at the first failing guard.
export const lint = (
	inventory: Inventory,
): Effect.Effect<readonly Violation[]> =>
	Effect.map(
		Effect.all(
			[
				Effect.sync(() => structureViolations(inventory)),
				Effect.sync(() => nestingViolations(inventory)),
				Effect.sync(() => commentViolations(inventory)),
				Effect.sync(() => pragmaViolations(inventory)),
				Effect.sync(() => manifestViolations(inventory)),
				contractViolations(inventory),
			],
			{ concurrency: "unbounded" },
		),
		(results) => results.flat(),
	);
