import { Result, Schema } from "effect";
import { jsonDecoder } from "#lint/adapters/json.ts";
import type { Inventory } from "#lint/inventory.ts";
import { placementOf } from "#lint/rules/layout-groups.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const EXPORTS_RULE = "layout/package-exports";
const BARREL_RULE = "layout/package-barrel";
const WILDCARD = { "./*": "./src/*" };
const STYLE = 'a nested package exports { "./*": "./src/*" } and an import names its file, extension and all';

const decodeExports = jsonDecoder(Schema.Struct({ exports: Schema.optional(Schema.Unknown) }));

const nested = (packages: readonly WorkspacePackage[]): readonly WorkspacePackage[] =>
	packages.filter((candidate) => {
		const group = placementOf(candidate.root).group;
		return group !== "app" && group !== "old";
	});

const exportsViolations = (inventory: Inventory, packages: readonly WorkspacePackage[]): readonly Violation[] =>
	packages.flatMap((owner) => {
		const manifest = inventory.manifests.find((candidate) => candidate.path === `${owner.root}/package.json`);
		const decoded = manifest === undefined ? undefined : decodeExports(manifest.raw);
		if (decoded === undefined || Result.isFailure(decoded)) {
			return [];
		}
		if (JSON.stringify(decoded.success.exports) === JSON.stringify(WILDCARD)) {
			return [];
		}
		return [
			{
				file: `${owner.root}/package.json`,
				line: undefined,
				message: `${owner.name} exports ${JSON.stringify(decoded.success.exports ?? null)}: ${STYLE}.`,
				rule: EXPORTS_RULE,
			},
		];
	});

const barrelViolations = (inventory: Inventory, packages: readonly WorkspacePackage[]): readonly Violation[] =>
	inventory.sources.flatMap((file) => {
		const owner = packageOf(packages, file.path);
		if (owner === undefined || file.path !== `${owner.root}/src/index.ts`) {
			return [];
		}
		return [
			{
				file: file.path,
				line: undefined,
				message: `${owner.name} keeps a barrel: ${STYLE}.`,
				rule: BARREL_RULE,
			},
		];
	});

export const layoutExportsViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = nested(workspacePackages(inventory));
	return [...exportsViolations(inventory, packages), ...barrelViolations(inventory, packages)];
};
