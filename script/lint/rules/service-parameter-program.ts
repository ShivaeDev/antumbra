import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { isDeclaration, type SourceFile } from "#lint/inventory.ts";

export interface CheckedSource {
	readonly path: string;
	readonly source: ts.SourceFile;
}

export interface ServiceParameterProgram {
	readonly checker: ts.TypeChecker;
	readonly sources: readonly CheckedSource[];
}

const OPTIONS: ts.CompilerOptions = {
	allowImportingTsExtensions: true,
	exactOptionalPropertyTypes: true,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	noEmit: true,
	noLib: true,
	noUncheckedIndexedAccess: true,
	skipLibCheck: true,
	strict: true,
	target: ts.ScriptTarget.ESNext,
	types: [],
	verbatimModuleSyntax: true,
};

const normalized = (path: string): string => resolve(path);

const kindOf = (path: string): ts.ScriptKind => (path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

const hashBase = (specifier: string, containing: string, root: string): string | undefined => {
	if (!specifier.startsWith("#")) return undefined;
	const packageParts = relative(root, containing).split("/");
	if (packageParts[0] === "script") {
		return join(root, "script", specifier.slice(1));
	}
	if (packageParts.length <= 2) return undefined;
	const packageRoot = join(root, packageParts[0] ?? "", packageParts[1] ?? "");
	if (specifier.startsWith("#test/")) {
		return join(packageRoot, "test", specifier.slice("#test/".length));
	}
	if (specifier.startsWith("#script/")) {
		return join(packageRoot, "script", specifier.slice("#script/".length));
	}
	return join(packageRoot, "src", specifier.slice(1));
};

const workspaceBase = (specifier: string, root: string): string | undefined => {
	if (!specifier.startsWith("@antumbra/")) return undefined;
	const [name, ...subpath] = specifier.slice("@antumbra/".length).split("/");
	const base = join(root, "packages", name ?? "", "src", ...subpath);
	return subpath.length === 0 ? join(base, "index") : base;
};

const candidatesFor = (specifier: string, containing: string, root: string): readonly string[] => {
	const base = specifier.startsWith(".")
		? resolve(dirname(containing), specifier)
		: (hashBase(specifier, containing, root) ?? workspaceBase(specifier, root));
	if (base === undefined) return [];
	return /\.tsx?$/.test(base) ? [base] : [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
};

export const serviceParameterProgram = (files: readonly SourceFile[], root: string): ServiceParameterProgram => {
	const contents = new Map(
		files.filter((file) => !isDeclaration(file.path)).map((file) => [normalized(resolve(root, file.path)), file.lines.join("\n")]),
	);
	const host = ts.createCompilerHost(OPTIONS, true);
	const readFile = host.readFile.bind(host);
	const fileExists = host.fileExists.bind(host);
	const getSourceFile = host.getSourceFile.bind(host);
	host.readFile = (path) => contents.get(normalized(path)) ?? readFile(path);
	host.fileExists = (path) => contents.has(normalized(path)) || fileExists(path);
	host.resolveModuleNames = (names, containing) =>
		names.map((name) => {
			const path = candidatesFor(name, containing, root).find((candidate) => contents.has(normalized(candidate)));
			return path === undefined ? undefined : { extension: ts.Extension.Ts, resolvedFileName: path };
		});
	host.getSourceFile = (path, languageVersion, onError, fresh) => {
		const content = contents.get(normalized(path));
		return content === undefined
			? getSourceFile(path, languageVersion, onError, fresh)
			: ts.createSourceFile(path, content, languageVersion, true, kindOf(path));
	};
	const program = ts.createProgram({
		host,
		options: OPTIONS,
		rootNames: [...contents.keys()],
	});
	const sources = files.flatMap((file) => {
		if (isDeclaration(file.path)) return [];
		const source = program.getSourceFile(resolve(root, file.path));
		return source === undefined ? [] : [{ path: file.path, source }];
	});
	return { checker: program.getTypeChecker(), sources };
};
