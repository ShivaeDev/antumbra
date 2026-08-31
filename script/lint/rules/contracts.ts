import { join } from "node:path";
import { Effect } from "effect";
import { checkVirtualSources } from "#lint/adapters/typescript.ts";
import { basename, type Inventory } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

// skipLibCheck suppresses unresolved imports in declaration files.
// Virtual TypeScript twins restore those diagnostics without checking vendor declarations.

const CONTRACT_BASENAMES = new Set(["contract.d.ts", "end-contract.d.ts", "start-contract.d.ts"]);

const REMEDY =
	"Generated contract declarations must type-check from their own package: declare every package the emitter imports as a dependency. The regular typecheck cannot see this, because skipLibCheck mutes .d.ts resolution failures.";

export const contractViolations = (inventory: Inventory): Effect.Effect<readonly Violation[]> => {
	const twins = inventory.sources
		.filter((file) => CONTRACT_BASENAMES.has(basename(file.path)))
		.map((file) => ({
			content: file.lines.join("\n"),
			declaration: file.path,
			path: join(inventory.root, file.path).replace(/\.d\.ts$/, ".contract-check.ts"),
		}));
	const declarations = new Map(twins.map((twin) => [twin.path, twin.declaration]));
	return Effect.map(checkVirtualSources(twins), (diagnostics) =>
		diagnostics.map((diagnostic) => ({
			file: diagnostic.path === undefined ? "(global)" : (declarations.get(diagnostic.path) ?? diagnostic.path),
			line: undefined,
			message: `TS${diagnostic.code}: ${diagnostic.message}\n    ${REMEDY}`,
			rule: "contracts/declaration-resolves",
		})),
	);
};
