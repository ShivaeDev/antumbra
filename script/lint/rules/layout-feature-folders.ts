import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, workspacePackages } from "#lint/workspace.ts";

const RULE = "layout/feature-folders";
const SHAPE = "a domain holds rows, facts, commands, materializers and queries, one file deep, beside feature.ts and ids.ts, and nothing else";
const DOMAIN_SOURCE = /^packages\/server\/domains\/[^/]+\/src\/(.+)$/;
const FOLDERS = ["rows", "facts", "commands", "materializers", "queries"];
const FILES = ["feature.ts", "ids.ts"];

const placed = (within: string): boolean => {
	const [first, second, ...deeper] = within.split("/");
	if (second === undefined) {
		return FILES.includes(first ?? "");
	}
	return deeper.length === 0 && FOLDERS.includes(first ?? "");
};

export const layoutFeatureFolderViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => {
			const within = DOMAIN_SOURCE.exec(file.path)?.[1];
			const owner = packageOf(packages, file.path);
			if (within === undefined || owner === undefined || placed(within)) {
				return [];
			}
			return [{ file: file.path, line: undefined, message: `${owner.name} may not hold src/${within}: ${SHAPE}.`, rule: RULE }];
		});
};
