import type { Inventory } from "#lint/inventory.ts";
import { findServiceParameters } from "#lint/rules/service-parameter-analysis.ts";
import type { Violation } from "#lint/violation.ts";
import { workspacePackages } from "#lint/workspace.ts";

const RULE = "effect/service-parameter-debt";

export const serviceParameterViolations = (inventory: Inventory): readonly Violation[] =>
	findServiceParameters(inventory.sources, inventory.root, workspacePackages(inventory)).map((debt) => ({
		file: debt.file,
		line: debt.line,
		message: `Parameter "${debt.parameter}" of "${debt.callable}" receives the service-bearing type "${debt.type}". Require services from Effect instead.`,
		rule: RULE,
	}));
