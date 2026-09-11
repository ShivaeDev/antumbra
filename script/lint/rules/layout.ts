import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import { allowanceOf, mayImport, placementOf } from "#lint/rules/layout-groups.ts";
import { type Specifier, specifiersOf } from "#lint/rules/layout-specifiers.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const RULE = "layout/dependency-direction";
const SCOPE = "@antumbra/";

const OLD_IMPORT_EXCEPTIONS: readonly { readonly from: string; readonly to: string }[] = [
	{ from: "@antumbra/renderer", to: "@antumbra/glass-role-settings" },
	{ from: "@antumbra/renderer", to: "@antumbra/glass-settings" },
	{ from: "@antumbra/renderer", to: "@antumbra/glass-voyages" },
];

const excepted = (from: WorkspacePackage, to: WorkspacePackage): boolean =>
	OLD_IMPORT_EXCEPTIONS.some((exception) => exception.from === from.name && exception.to === to.name);

const edgeViolations = (path: string, from: WorkspacePackage, packages: readonly WorkspacePackage[], specifier: Specifier): readonly Violation[] => {
	const [name] = specifier.text.slice(SCOPE.length).split("/");
	const to = packages.find((candidate) => candidate.name === `${SCOPE}${name}`);
	if (to === undefined || to.root === from.root) {
		return [];
	}
	const placement = placementOf(from.root);
	if (mayImport(placement, placementOf(to.root)) || excepted(from, to)) {
		return [];
	}
	const allowance = allowanceOf(placement);
	return [
		{
			file: path,
			line: specifier.line,
			message: `${from.name} may not import ${specifier.text}: ${allowance.group} packages import ${allowance.allowed}.`,
			rule: RULE,
		},
	];
};

export const layoutViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => {
			const from = packageOf(packages, file.path);
			return from === undefined
				? []
				: specifiersOf(file)
						.filter((specifier) => specifier.text.startsWith(SCOPE))
						.flatMap((specifier) => edgeViolations(file.path, from, packages, specifier));
		});
};
