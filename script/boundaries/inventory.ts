import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { BoundaryDependency } from "#boundaries/model.ts";

const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;
const excludedDirectory = new Set(["dist", "node_modules", "out"]);

export interface BoundaryInventory {
	readonly dependencies: number;
	readonly dependencyEvidence: readonly BoundaryDependency[];
	readonly modules: readonly string[];
}

const walkSources = (directory: string, root: string): readonly string[] =>
	readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			return excludedDirectory.has(entry.name) ? [] : walkSources(path, root);
		}
		return entry.isFile() && sourceExtension.test(entry.name) ? [relative(root, path).split(sep).join("/")] : [];
	});

export const expectedBoundarySources = (root: string, sourceRoots: readonly string[]): readonly string[] =>
	sourceRoots.flatMap((sourceRoot) => walkSources(join(root, sourceRoot), root));

export const boundaryInventoryFailures = (inventory: BoundaryInventory, expectedSources: readonly string[]): readonly string[] => {
	const failures: string[] = [];
	if (inventory.modules.length === 0) {
		failures.push("dependency-cruiser inspected zero modules");
	}
	if (inventory.dependencies === 0) {
		failures.push("dependency-cruiser inspected zero dependencies");
	}
	for (const dependency of inventory.dependencyEvidence) {
		if (dependency.specifier.startsWith("@antumbra/") && dependency.couldNotResolve) {
			failures.push(`dependency-cruiser could not resolve workspace specifier ${dependency.specifier} from ${dependency.from}`);
		}
	}
	const covered = new Set(inventory.modules);
	const missing = expectedSources.filter((source) => !covered.has(source));
	if (missing.length > 0) {
		failures.push(`dependency-cruiser missed ${missing.length} workspace source(s): ${missing.join(", ")}`);
	}
	return failures;
};
