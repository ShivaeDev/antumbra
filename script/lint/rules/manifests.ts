import { parseJson } from "#lint/adapters/json.ts";
import type { Inventory, TextFile } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

const EXACT_VERSION =
	/^(npm:.+@)?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const CATALOG_HEADING = /^catalogs?:/;
const TOP_LEVEL_KEY = /^\S/;
const CATALOG_ENTRY = /^\s+"?([^":]+)"?:\s*(\S.*)$/;
const DEPENDENCY_KEYS = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

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

const catalogViolations = (catalog: string): readonly Violation[] =>
	catalogLines(catalog).flatMap((line) => {
		const entry = CATALOG_ENTRY.exec(line);
		const value = (entry?.[2] ?? "").replace(/^["']|["']$/g, "");
		return entry === null || EXACT_VERSION.test(value)
			? []
			: [
					{
						file: "pnpm-workspace.yaml",
						line: undefined,
						message: `catalog entry "${entry[1]}: ${value}" is not an exact version. Ranges are banned; pin the version and let upgrades be visible diffs.`,
						rule: "manifests/exact-catalog-version",
					},
				];
	});

const dependencyViolations = (
	manifest: TextFile,
	key: string,
	deps: unknown,
): readonly Violation[] =>
	isRecord(deps)
		? Object.entries(deps).flatMap(([name, spec]) =>
				typeof spec === "string" &&
				(spec.startsWith("catalog:") || spec.startsWith("workspace:"))
					? []
					: [
							{
								file: manifest.path,
								line: undefined,
								message: `${key} entry "${name}": "${String(spec)}" bypasses the catalog. Use "catalog:" and pin the exact version in pnpm-workspace.yaml.`,
								rule: "manifests/catalog-only",
							},
						],
			)
		: [];

const oneManifestViolations = (manifest: TextFile): readonly Violation[] => {
	const parsed = parseJson(manifest.raw);
	return isRecord(parsed)
		? DEPENDENCY_KEYS.flatMap((key) =>
				dependencyViolations(manifest, key, parsed[key]),
			)
		: [
				{
					file: manifest.path,
					line: undefined,
					message: "is not a readable JSON manifest.",
					rule: "manifests/unreadable",
				},
			];
};

export const manifestViolations = (
	inventory: Inventory,
): readonly Violation[] => [
	...catalogViolations(inventory.workspaceCatalog),
	...inventory.manifests.flatMap(oneManifestViolations),
];
