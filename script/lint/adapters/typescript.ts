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

export interface SourceComment {
	readonly content: string;
	readonly endLine: number;
	readonly fullLine: boolean;
	readonly kind: "block" | "line";
	readonly line: number;
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

const commentRanges = (source: ts.SourceFile): readonly ts.CommentRange[] => {
	const ranges = new Map<string, ts.CommentRange>();
	const jsxTextSpans: Array<{ readonly end: number; readonly pos: number }> =
		[];
	const add = (found: readonly ts.CommentRange[] | undefined) => {
		for (const range of found ?? []) {
			ranges.set(`${range.pos}:${range.end}`, range);
		}
	};
	const visit = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.JsxText) {
			jsxTextSpans.push({ end: node.end, pos: node.pos });
		}
		add(ts.getLeadingCommentRanges(source.text, node.pos));
		add(ts.getTrailingCommentRanges(source.text, node.end));
		for (const child of node.getChildren(source)) {
			visit(child);
		}
	};
	visit(source);
	return [...ranges.values()]
		.filter(
			(range) =>
				!jsxTextSpans.some(
					(span) => range.pos >= span.pos && range.pos < span.end,
				),
		)
		.sort((left, right) => left.pos - right.pos);
};

export const sourceComments = (
	path: string,
	content: string,
): readonly SourceComment[] => {
	const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
	const source = ts.createSourceFile(
		path,
		content,
		ts.ScriptTarget.Latest,
		true,
		kind,
	);
	return commentRanges(source).map((range) => {
		const start = source.getLineAndCharacterOfPosition(range.pos);
		const end = source.getLineAndCharacterOfPosition(range.end - 1);
		const lineStart = source.getPositionOfLineAndCharacter(start.line, 0);
		return {
			content: content.slice(range.pos, range.end),
			endLine: end.line + 1,
			fullLine: content.slice(lineStart, range.pos).trim() === "",
			kind:
				range.kind === ts.SyntaxKind.SingleLineCommentTrivia ? "line" : "block",
			line: start.line + 1,
		};
	});
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
