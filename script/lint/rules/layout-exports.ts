import { Result, Schema } from "effect";
import { jsonDecoder } from "#lint/adapters/json.ts";
import type { Inventory } from "#lint/inventory.ts";
import { placementOf } from "#lint/rules/layout-groups.ts";
import type { Violation } from "#lint/violation.ts";
import { type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const EXPORTS_RULE = "layout/package-exports";
const WILDCARD = { "./*": "./src/*" };
const STYLE = 'a nested package exports { "./*": "./src/*" } and an import names its file, extension and all';

const decodeExports = jsonDecoder(Schema.Struct({ exports: Schema.optional(Schema.Unknown) }));

const nested = (packages: readonly WorkspacePackage[]): readonly WorkspacePackage[] =>
	packages.filter((candidate) => {
		const group = placementOf(candidate.root).group;
		return group !== "app" && group !== "old";
	});

export const layoutExportsViolations = (inventory: Inventory): readonly Violation[] =>
	nested(workspacePackages(inventory)).flatMap((owner) => {
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
