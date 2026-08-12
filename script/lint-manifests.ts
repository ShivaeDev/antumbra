import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

interface Violation {
	readonly source: string;
	readonly message: string;
}

const root = process.argv[2] ?? process.cwd();
const violations: Violation[] = [];

const EXACT_VERSION =
	/^(npm:.+@)?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

const readOrEmpty = (path: string): string => {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
};

let inCatalog = false;
for (const line of readOrEmpty(join(root, "pnpm-workspace.yaml")).split("\n")) {
	if (/^catalogs?:/.test(line)) {
		inCatalog = true;
		continue;
	}
	if (/^\S/.test(line)) {
		inCatalog = false;
	}
	if (!inCatalog) {
		continue;
	}
	const entry = /^\s+"?([^":]+)"?:\s*(\S.*)$/.exec(line);
	if (!entry) {
		continue;
	}
	const name = entry[1];
	const value = (entry[2] ?? "").replace(/^["']|["']$/g, "");
	if (!EXACT_VERSION.test(value)) {
		violations.push({
			source: "pnpm-workspace.yaml",
			message: `catalog entry "${name}: ${value}" is not an exact version. Ranges are banned; pin the version and let upgrades be visible diffs.`,
		});
	}
}

const DEP_KEYS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
];

const manifestPaths = [
	"package.json",
	...["apps", "packages"].flatMap((zone) => {
		try {
			return readdirSync(join(root, zone)).map((entry) =>
				join(zone, entry, "package.json"),
			);
		} catch {
			return [];
		}
	}),
];

let checked = 0;
for (const rel of manifestPaths) {
	const raw = readOrEmpty(join(root, rel));
	if (raw === "") {
		continue;
	}
	checked += 1;
	const manifest: Record<string, unknown> = JSON.parse(raw);
	for (const key of DEP_KEYS) {
		const deps = manifest[key];
		if (typeof deps !== "object" || deps === null) {
			continue;
		}
		for (const [name, spec] of Object.entries(deps as Record<string, string>)) {
			if (spec.startsWith("catalog:") || spec.startsWith("workspace:")) {
				continue;
			}
			violations.push({
				source: rel.replaceAll("\\", "/"),
				message: `${key} entry "${name}": "${spec}" bypasses the catalog. Use "catalog:" and pin the exact version in pnpm-workspace.yaml.`,
			});
		}
	}
}

if (violations.length > 0) {
	console.error(
		"Manifest lint failed — every version lives exactly once, exact, in the catalog:\n",
	);
	for (const v of violations) {
		console.error(`  ${v.source}\n    ${v.message}\n`);
	}
	console.error(`${violations.length} violation(s).`);
	process.exit(1);
}

console.log(`Manifest lint passed (${checked} manifest(s)).`);
