import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const MAX_SOURCE_LINES = 150;
const MAX_TEST_LINES = 300;

interface Violation {
	readonly file: string;
	readonly message: string;
}

const root = process.argv[2] ?? process.cwd();
const violations: Violation[] = [];

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

for (const file of files) {
	const rel = relative(root, file).replaceAll("\\", "/");
	const base = rel.split("/").pop() ?? "";
	const lineCount = readFileSync(file, "utf8").split("\n").length;
	const isTest = /\.(test|spec)\.tsx?$/.test(base) || rel.includes("/test/");

	const limit = isTest ? MAX_TEST_LINES : MAX_SOURCE_LINES;
	if (lineCount > limit) {
		violations.push({
			file: rel,
			message: `${lineCount} lines exceeds the ${limit}-line limit. Split it along its responsibilities; never golf it under the cap.`,
		});
	}

	if (base === "index.ts" || base === "index.tsx") {
		const isPackageEntry = /^(apps|packages)\/[^/]+\/src\/index\.tsx?$/.test(
			rel,
		);
		if (!isPackageEntry) {
			violations.push({
				file: rel,
				message:
					"index.ts barrels are banned outside the package entry (src/index.ts). Name the module after its purpose and import it explicitly.",
			});
		}
	}
}

if (violations.length > 0) {
	console.error("Structure lint failed:\n");
	for (const v of violations) {
		console.error(`  ${v.file}\n    ${v.message}\n`);
	}
	console.error(`${violations.length} violation(s).`);
	process.exit(1);
}

console.log(`Structure lint passed (${files.length} files).`);
