import { Result, Schema } from "effect";
import { jsonDecoder } from "#lint/adapters/json.ts";
import type { Inventory } from "#lint/inventory.ts";

export interface WorkspacePackage {
	readonly name: string;
	readonly root: string;
}

const PACKAGE_ROOT = /^((?:apps|packages)\/[^/]+(?:\/[^/]+){0,2})\/package\.json$/;

const decodeName = jsonDecoder(Schema.Struct({ name: Schema.optional(Schema.String) }));

const packageAt = (path: string, raw: string): readonly WorkspacePackage[] => {
	const root = PACKAGE_ROOT.exec(path)?.[1];
	const decoded = decodeName(raw);
	if (root === undefined || Result.isFailure(decoded) || decoded.success.name === undefined) {
		return [];
	}
	return [{ name: decoded.success.name, root }];
};

export const workspacePackages = (inventory: Inventory): readonly WorkspacePackage[] =>
	inventory.manifests.flatMap((manifest) => packageAt(manifest.path, manifest.raw));

export const packageOf = (packages: readonly WorkspacePackage[], path: string): WorkspacePackage | undefined =>
	packages.reduce<WorkspacePackage | undefined>(
		(found, candidate) =>
			path.startsWith(`${candidate.root}/`) && (found === undefined || candidate.root.length > found.root.length) ? candidate : found,
		undefined,
	);
