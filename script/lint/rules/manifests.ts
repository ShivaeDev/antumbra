import { Result, Schema } from "effect";
import { jsonDecoder } from "#lint/adapters/json.ts";
import type { Inventory, TextFile } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

const EXACT_VERSION = /^(npm:.+@)?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const CATALOG_HEADING = /^catalogs?:/;
const TOP_LEVEL_KEY = /^\S/;
const CATALOG_ENTRY = /^\s+"?([^":]+)"?:\s*(\S.*)$/;
const DEPENDENCY_KEYS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const;
const DependencyMap = Schema.Record(Schema.String, Schema.Unknown);
const decodeManifest = jsonDecoder(
	Schema.Struct({
		dependencies: Schema.optional(DependencyMap),
		devDependencies: Schema.optional(DependencyMap),
		optionalDependencies: Schema.optional(DependencyMap),
		peerDependencies: Schema.optional(DependencyMap),
	}),
);

const catalogLines = (catalog: string): readonly string[] => {
	const collected: string[] = [];
	let inCatalog = false;
	for (const line of catalog.split("\n")) {
		if (CATALOG_HEADING.test(line)) {
			inCatalog = true;
			continue;
		}
		if (TOP_LEVEL_KEY.test(line)) {
			inCatalog = false;
		}
		if (inCatalog) {
			collected.push(line);
		}
	}
	return collected;
};

const catalogViolation = (line: string): readonly Violation[] => {
	const entry = CATALOG_ENTRY.exec(line);
	if (entry === null) {
		return [];
	}
	const value = (entry[2] ?? "").replace(/^["']|["']$/g, "");
	if (EXACT_VERSION.test(value)) {
		return [];
	}
	return [
		{
			file: "pnpm-workspace.yaml",
			line: undefined,
			message: `catalog entry "${entry[1]}: ${value}" is not an exact version. Ranges are banned; pin the version and let upgrades be visible diffs.`,
			rule: "manifests/exact-catalog-version",
		},
	];
};

const catalogViolations = (catalog: string): readonly Violation[] => catalogLines(catalog).flatMap(catalogViolation);

const dependencyViolation = (manifest: TextFile, key: string, name: string, spec: unknown): readonly Violation[] => {
	const throughCatalog = typeof spec === "string" && (spec.startsWith("catalog:") || spec.startsWith("workspace:"));
	if (throughCatalog) {
		return [];
	}
	return [
		{
			file: manifest.path,
			line: undefined,
			message: `${key} entry "${name}": "${String(spec)}" bypasses the catalog. Use "catalog:" and pin the exact version in pnpm-workspace.yaml.`,
			rule: "manifests/catalog-only",
		},
	];
};

const dependencyViolations = (manifest: TextFile, key: string, deps: Readonly<Record<string, unknown>> | undefined): readonly Violation[] => {
	if (deps === undefined) {
		return [];
	}
	return Object.entries(deps).flatMap(([name, spec]) => dependencyViolation(manifest, key, name, spec));
};

const oneManifestViolations = (manifest: TextFile): readonly Violation[] => {
	const decoded = decodeManifest(manifest.raw);
	if (Result.isFailure(decoded)) {
		return [
			{
				file: manifest.path,
				line: undefined,
				message: "is not a readable JSON manifest.",
				rule: "manifests/unreadable",
			},
		];
	}
	return DEPENDENCY_KEYS.flatMap((key) => dependencyViolations(manifest, key, decoded.success[key]));
};

export const manifestViolations = (inventory: Inventory): readonly Violation[] => [
	...catalogViolations(inventory.workspaceCatalog),
	...inventory.manifests.flatMap(oneManifestViolations),
];
