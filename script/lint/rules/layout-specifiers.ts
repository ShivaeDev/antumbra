import ts from "typescript";
import type { SourceFile } from "#lint/inventory.ts";

export interface Specifier {
	readonly line: number;
	readonly text: string;
}

export const specifiersOf = (file: SourceFile): readonly Specifier[] => {
	const source = ts.createSourceFile(
		file.path,
		file.lines.join("\n"),
		ts.ScriptTarget.Latest,
		true,
		file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const found: Specifier[] = [];
	const record = (node: ts.Node | undefined) => {
		if (node !== undefined && ts.isStringLiteralLike(node)) {
			found.push({
				line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
				text: node.text,
			});
		}
	};
	const visit = (node: ts.Node) => {
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			record(node.moduleSpecifier);
		}
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			record(node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
};
