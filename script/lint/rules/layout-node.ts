import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import { placementOf } from "#lint/rules/layout-groups.ts";
import { specifiersOf } from "#lint/rules/layout-specifiers.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const RULE = "layout/node-only-in-apps";
const ALLOWANCE = "only a package under apps/ may reach the machine";

const REACHING = [
	"@effect/platform-node",
	"@effect/platform-node-shared",
	"@effect/sql-sqlite-node",
	"ws",
	"node:child_process",
	"node:fs",
	"node:fs/promises",
	"node:net",
	"node:http",
	"node:https",
	"node:http2",
	"node:dgram",
	"node:dns",
	"node:tls",
	"node:worker_threads",
	"node:cluster",
	"node:sqlite",
	"node:os",
	"node:process",
	"child_process",
	"fs",
	"fs/promises",
	"net",
	"http",
	"https",
	"http2",
	"dgram",
	"dns",
	"tls",
	"worker_threads",
	"cluster",
	"sqlite",
	"os",
	"process",
];

const OWNERS: readonly { readonly root: string; readonly specifier: string }[] = [
	{ root: "packages/platform/trace-sink", specifier: "node:sqlite" },
	{ root: "packages/server/journal", specifier: "@effect/sql-sqlite-node" },
];

const names = (specifier: string, module: string): boolean => specifier === module || specifier.startsWith(`${module}/`);

const inScope = (owner: WorkspacePackage, path: string): boolean => {
	const { group } = placementOf(owner.root);
	return group !== "app" && group !== "old" && path.startsWith(`${owner.root}/src/`);
};

const reaching = (owner: WorkspacePackage, specifier: string): boolean =>
	REACHING.some((module) => names(specifier, module)) && !OWNERS.some((owns) => owns.root === owner.root && names(specifier, owns.specifier));

export const layoutNodeViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => {
			const owner = packageOf(packages, file.path);
			if (owner === undefined || !inScope(owner, file.path)) {
				return [];
			}
			return specifiersOf(file)
				.filter((specifier) => reaching(owner, specifier.text))
				.map((specifier) => ({
					file: file.path,
					line: specifier.line,
					message: `${owner.name} may not import ${specifier.text}: ${ALLOWANCE}.`,
					rule: RULE,
				}));
		});
};
