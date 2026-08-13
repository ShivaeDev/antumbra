import { Effect } from "effect";
import ts from "typescript";

export interface VirtualSource {
	readonly content: string;
	readonly path: string;
}

export interface TypeDiagnostic {
	readonly code: number;
	readonly message: string;
	readonly path: string | undefined;
}

const OPTIONS: ts.CompilerOptions = {
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

export const checkVirtualSources = (
	sources: readonly VirtualSource[],
): Effect.Effect<readonly TypeDiagnostic[]> =>
	Effect.sync(() => {
		const contents = new Map(
			sources.map((source) => [source.path, source.content]),
		);
		const host = ts.createCompilerHost(OPTIONS, true);
		const readFile = host.readFile.bind(host);
		const fileExists = host.fileExists.bind(host);
		host.readFile = (file) => contents.get(file) ?? readFile(file);
		host.fileExists = (file) => contents.has(file) || fileExists(file);
		const program = ts.createProgram([...contents.keys()], OPTIONS, host);
		return ts
			.getPreEmitDiagnostics(program)
			.filter(
				(diagnostic) =>
					diagnostic.file === undefined ||
					contents.has(diagnostic.file.fileName),
			)
			.map((diagnostic) => ({
				code: diagnostic.code,
				message: ts.flattenDiagnosticMessageText(
					diagnostic.messageText,
					"\n    ",
				),
				path: diagnostic.file?.fileName,
			}));
	});
