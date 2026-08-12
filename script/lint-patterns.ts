import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

interface Rule {
	readonly id: string;
	readonly pattern: RegExp;
	readonly message: string;
	readonly excludePaths?: readonly string[];
	readonly includeOnly?: RegExp;
}

const ADAPTER_EXEMPT = ["/adapters/"] as const;

export const RULES: readonly Rule[] = [
	{
		excludePaths: ADAPTER_EXEMPT,
		id: "no-async-await",
		message:
			"async/await is banned outside adapter modules. Model effects with Effect; wrap external SDKs in an adapters/ module.",
		pattern: /\basync\s|\bawait\s/,
	},
	{
		excludePaths: ADAPTER_EXEMPT,
		id: "no-raw-promise",
		message:
			"Raw Promises are banned outside adapter modules. Use Effect; bridge external promises in an adapters/ module.",
		pattern: /\bnew Promise\b|\.then\(/,
	},
	{
		excludePaths: ADAPTER_EXEMPT,
		id: "no-try-catch",
		message:
			"try/catch is banned. Failures travel on the Effect error channel as tagged errors.",
		pattern: /\btry\s*\{|\bcatch\s*[({]/,
	},
	{
		excludePaths: ADAPTER_EXEMPT,
		id: "no-throw",
		message:
			"throw is banned. Fail with tagged errors on the Effect error channel (or Effect.die for defects).",
		pattern: /\bthrow\s/,
	},
	{
		id: "no-ambient-time",
		message:
			"Ambient time is banned. Read time through Effect's Clock service.",
		pattern: /\bDate\.now\(|\bnew Date\(\)/,
	},
	{
		id: "no-ambient-random",
		message: "Ambient randomness is banned. Use Effect's Random service.",
		pattern: /\bMath\.random\(/,
	},
	{
		id: "no-console",
		message: "console.* is banned. Log through Effect's logger.",
		pattern: /\bconsole\.\w+\(/,
	},
	{
		id: "no-process-env",
		message:
			"process.env is banned. Read configuration through Effect's Config service.",
		pattern: /\bprocess\.env\b/,
	},
	{
		id: "no-ts-ignore",
		message:
			"@ts-ignore is never allowed. Use @ts-expect-error with a reason, registered in the pragma registry.",
		pattern: /@ts-ignore/,
	},
	{
		id: "no-plain-comment",
		message:
			"Comments are banned unless they carry the why: marker or are registered pragmas. State constraints in code; when code cannot express one, write `// why: ...`.",
		pattern:
			/(?:^|[^:"'`])\/\/(?!\s*why:)(?![/!]?\s*(?:biome-ignore|@ts-expect-error))|\/\*(?!\s*why:)/,
	},
];

interface Violation {
	readonly file: string;
	readonly line: number;
	readonly ruleId: string;
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
	const lines = readFileSync(file, "utf8").split("\n");
	for (const rule of RULES) {
		if (rule.excludePaths?.some((p) => rel.includes(p))) {
			continue;
		}
		if (rule.includeOnly && !rule.includeOnly.test(rel)) {
			continue;
		}
		lines.forEach((text, index) => {
			if (rule.pattern.test(text)) {
				violations.push({
					file: rel,
					line: index + 1,
					message: rule.message,
					ruleId: rule.id,
				});
			}
		});
	}
}

if (violations.length > 0) {
	console.error("Pattern lint failed:\n");
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line} [${v.ruleId}]\n    ${v.message}\n`);
	}
	console.error(`${violations.length} violation(s).`);
	process.exit(1);
}

console.log(`Pattern lint passed (${files.length} files).`);
