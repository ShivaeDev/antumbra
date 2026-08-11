import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

interface RegistryEntry {
	readonly file: string;
	readonly pragma: string;
	readonly reason: string;
}

const root = process.argv[2] ?? process.cwd();
const registryPath =
	process.argv[3] ?? join(root, "script", "pragma-registry.json");
const registry: readonly RegistryEntry[] = JSON.parse(
	readFileSync(registryPath, "utf8"),
);

const PRAGMA = /biome-ignore|@ts-expect-error/;

const walk = (dir: string): string[] => {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return [];
	}
	return entries.flatMap((entry) => {
		if (entry === "node_modules" || entry === "dist" || entry === "out") {
			return [];
		}
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			return walk(full);
		}
		return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
	});
};

const files = ["apps", "packages"].flatMap((zone) => walk(join(root, zone)));
const unregistered: string[] = [];

for (const file of files) {
	const rel = relative(root, file).replaceAll("\\", "/");
	const lines = readFileSync(file, "utf8").split("\n");
	lines.forEach((text, index) => {
		const match = PRAGMA.exec(text);
		if (match) {
			const entry = registry.find(
				(r) => r.file === rel && text.includes(r.pragma),
			);
			if (!entry) {
				unregistered.push(
					`${rel}:${index + 1} uses "${match[0]}" without a registry entry`,
				);
			}
		}
	});
}

if (unregistered.length > 0) {
	console.error(
		"Pragma lint failed — every lint escape must be enumerated in script/pragma-registry.json:\n",
	);
	for (const line of unregistered) {
		console.error(`  ${line}`);
	}
	process.exit(1);
}

console.log(`Pragma lint passed (${registry.length} registered escape(s)).`);
