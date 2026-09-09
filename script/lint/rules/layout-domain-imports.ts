import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import { specifiersOf } from "#lint/rules/layout-specifiers.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const RULE = "layout/domain-imports";
const ALLOWANCE = "a domain imports effect, @antumbra/feature, @antumbra/vocabulary, its own subpaths, and another domain's rows and queries";
const DOMAIN_SOURCE = /^packages\/server\/domains\/[^/]+\/src\//;
const DOMAIN_ROOT = "packages/server/domains/";
const LIBRARIES = ["effect", "@antumbra/feature", "@antumbra/vocabulary"];
const DOMAIN_ENTRY = /^(@antumbra\/[^/]+)\/(?:rows|queries)\/[^/]+\.ts$/;

const names = (specifier: string, module: string): boolean => specifier === module || specifier.startsWith(`${module}/`);

const entryOfDomain = (packages: readonly WorkspacePackage[], specifier: string): boolean => {
	const named = DOMAIN_ENTRY.exec(specifier)?.[1];
	return packages.find((candidate) => candidate.name === named)?.root.startsWith(DOMAIN_ROOT) === true;
};

const allowed = (packages: readonly WorkspacePackage[], owner: WorkspacePackage, specifier: string): boolean =>
	specifier.startsWith("#") ||
	LIBRARIES.some((module) => names(specifier, module)) ||
	names(specifier, owner.name) ||
	entryOfDomain(packages, specifier);

export const layoutDomainImportViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path) && DOMAIN_SOURCE.test(file.path))
		.flatMap((file) => {
			const owner = packageOf(packages, file.path);
			if (owner === undefined) {
				return [];
			}
			return specifiersOf(file)
				.filter((specifier) => !allowed(packages, owner, specifier.text))
				.map((specifier) => ({
					file: file.path,
					line: specifier.line,
					message: `${owner.name} may not import ${specifier.text}: ${ALLOWANCE}.`,
					rule: RULE,
				}));
		});
};
