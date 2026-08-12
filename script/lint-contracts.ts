import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";
import ts from "typescript";

// why: skipLibCheck silences unresolved imports inside .d.ts files entirely,
// so a generated contract whose @prisma-next type imports do not resolve
// degrades every model type to `any` without a single diagnostic. Checking a
// virtual .ts twin of each contract declaration restores the resolution
// errors while vendor declarations stay lib-skipped.

const CONTRACT_BASENAMES = new Set([
	"contract.d.ts",
	"end-contract.d.ts",
	"start-contract.d.ts",
]);

const root = process.argv[2] ?? process.cwd();

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
		return CONTRACT_BASENAMES.has(entry) ? [full] : [];
	});
};

const contracts = ["apps", "packages"].flatMap((zone) =>
	walk(join(root, zone)),
);

const options: ts.CompilerOptions = {
	exactOptionalPropertyTypes: true,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	noEmit: true,
	noUncheckedIndexedAccess: true,
	skipLibCheck: true,
	strict: true,
	target: ts.ScriptTarget.ESNext,
	verbatimModuleSyntax: true,
};

const virtualToReal = new Map<string, string>(
	contracts.map((file) => [
		file.replace(/\.d\.ts$/, ".contract-check.ts"),
		file,
	]),
);

const host = ts.createCompilerHost(options, true);
const readFile = host.readFile.bind(host);
const fileExists = host.fileExists.bind(host);
host.readFile = (file) => {
	const real = virtualToReal.get(file);
	return real === undefined ? readFile(file) : readFileSync(real, "utf8");
};
host.fileExists = (file) => virtualToReal.has(file) || fileExists(file);

const program = ts.createProgram([...virtualToReal.keys()], options, host);
const diagnostics = ts
	.getPreEmitDiagnostics(program)
	.filter(
		(diagnostic) =>
			diagnostic.file === undefined ||
			virtualToReal.has(diagnostic.file.fileName),
	);

if (diagnostics.length > 0) {
	console.error("Contract lint failed:\n");
	for (const diagnostic of diagnostics) {
		const real =
			diagnostic.file === undefined
				? "(global)"
				: relative(
						root,
						virtualToReal.get(diagnostic.file.fileName) ??
							diagnostic.file.fileName,
					).replaceAll("\\", "/");
		const message = ts.flattenDiagnosticMessageText(
			diagnostic.messageText,
			"\n    ",
		);
		console.error(`  ${real}\n    TS${diagnostic.code}: ${message}\n`);
	}
	console.error(
		"Generated contract declarations must type-check from their own package. Declare every package the emitter imports (the @prisma-next type packages) as a dependency; the regular typecheck cannot see this because skipLibCheck mutes .d.ts resolution failures.",
	);
	console.error(`\n${diagnostics.length} violation(s).`);
	process.exit(1);
}

console.log(`Contract lint passed (${contracts.length} contract file(s)).`);
