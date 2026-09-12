import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import { specifiersOf } from "#lint/rules/layout-specifiers.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

interface Scope {
	readonly allowance: string;
	readonly entries: RegExp;
	readonly libraries: readonly string[];
	readonly name: string;
}

const RULE = "layout/domain-imports";
const DOMAIN_SOURCE = /^packages\/server\/domains\/[^/]+\/src\//;
const DOMAIN_TEST = /^packages\/server\/domains\/[^/]+\/test\//;
const DOMAIN_ROOT = "packages/server/domains/";
const LIBRARIES = ["effect", "@antumbra/platform-feature", "@antumbra/platform-vocabulary"];
const entriesOf = (folders: readonly string[]): RegExp => new RegExp(`^(@antumbra/[^/]+)/(?:(?:${folders.join("|")})/[^/]+|ids)\\.ts$`);

const SOURCES: Scope = {
	allowance:
		"a domain's sources import effect, @antumbra/platform-feature, @antumbra/platform-prompts, @antumbra/platform-vocabulary, its own subpaths, and another domain's rows, queries, commands, ports and ids",
	entries: entriesOf(["rows", "queries", "commands", "ports"]),
	libraries: [...LIBRARIES, "@antumbra/platform-prompts"],
	name: "sources",
};

const TESTS: Scope = {
	allowance:
		"a domain's tests import effect, vitest, @antumbra/app-testing, @antumbra/platform-feature, @antumbra/platform-vocabulary, its own subpaths, and another domain's rows, queries and ids",
	entries: entriesOf(["rows", "queries"]),
	libraries: [...LIBRARIES, "vitest", "@antumbra/app-testing"],
	name: "tests",
};

const names = (specifier: string, module: string): boolean => specifier === module || specifier.startsWith(`${module}/`);

const scopeOf = (path: string): Scope | undefined => {
	if (DOMAIN_SOURCE.test(path)) {
		return SOURCES;
	}
	return DOMAIN_TEST.test(path) ? TESTS : undefined;
};

const entryOfDomain = (packages: readonly WorkspacePackage[], scope: Scope, specifier: string): boolean => {
	const named = scope.entries.exec(specifier)?.[1];
	return packages.find((candidate) => candidate.name === named)?.root.startsWith(DOMAIN_ROOT) === true;
};

const allowed = (packages: readonly WorkspacePackage[], owner: WorkspacePackage, scope: Scope, specifier: string): boolean =>
	specifier.startsWith("#") ||
	scope.libraries.some((module) => names(specifier, module)) ||
	names(specifier, owner.name) ||
	entryOfDomain(packages, scope, specifier);

export const layoutDomainImportViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => {
			const scope = scopeOf(file.path);
			const owner = packageOf(packages, file.path);
			if (scope === undefined || owner === undefined) {
				return [];
			}
			return specifiersOf(file)
				.filter((specifier) => !allowed(packages, owner, scope, specifier.text))
				.map((specifier) => ({
					file: file.path,
					line: specifier.line,
					message: `${owner.name} ${scope.name} may not import ${specifier.text}: ${scope.allowance}.`,
					rule: RULE,
				}));
		});
};
