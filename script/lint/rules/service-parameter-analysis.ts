import ts from "typescript";
import { isDeclaration, type SourceFile } from "#lint/inventory.ts";
import {
	type ParsedSource,
	serviceBearingTypes,
	typeIsServiceBearing,
} from "#lint/rules/service-parameter-types.ts";

export interface ServiceParameterDebt {
	readonly callable: string;
	readonly file: string;
	readonly line: number;
	readonly parameter: string;
	readonly type: string;
}

const exempt = (path: string): boolean =>
	path === "apps/desktop/src/main.ts" ||
	path.includes("/src/adapters/") ||
	/(^|\/)(test|tests|__tests__)(\/|$)/.test(path) ||
	/\.(test|spec)\.tsx?$/.test(path);

const callableName = (
	node: ts.FunctionLikeDeclaration,
	source: ts.SourceFile,
): string => {
	if (node.name !== undefined) return node.name.getText(source);
	let parent = node.parent;
	while (!ts.isSourceFile(parent)) {
		if (ts.isVariableDeclaration(parent)) return parent.name.getText(source);
		if (ts.isPropertyAssignment(parent)) return parent.name.getText(source);
		if (ts.isFunctionDeclaration(parent) && parent.name !== undefined) {
			return parent.name.getText(source);
		}
		parent = parent.parent;
	}
	const start = source.getLineAndCharacterOfPosition(node.getStart(source));
	return `<anonymous@${start.line + 1}:${start.character + 1}>`;
};

const hasImplementation = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
	(ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node)) &&
	node.body !== undefined;

const parse = (files: readonly SourceFile[]): readonly ParsedSource[] =>
	files
		.filter((file) => !isDeclaration(file.path))
		.map((file) => ({
			path: file.path,
			source: ts.createSourceFile(
				file.path,
				file.lines.join("\n"),
				ts.ScriptTarget.Latest,
				true,
				file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
			),
		}));

const lineOf = (source: ts.SourceFile, node: ts.Node): number =>
	source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

const debtsIn = (
	parsed: ParsedSource,
	tainted: ReadonlySet<string>,
): readonly ServiceParameterDebt[] => {
	const debts: ServiceParameterDebt[] = [];
	const { path, source } = parsed;
	const visit = (node: ts.Node) => {
		if (hasImplementation(node)) {
			for (const parameter of node.parameters) {
				if (
					parameter.type !== undefined &&
					typeIsServiceBearing(parameter.type, source, tainted)
				) {
					debts.push({
						callable: callableName(node, source),
						file: path,
						line: lineOf(source, parameter),
						parameter: parameter.name.getText(source),
						type: parameter.type.getText(source),
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return debts;
};

export const findServiceParameters = (
	files: readonly SourceFile[],
): readonly ServiceParameterDebt[] => {
	const parsed = parse(files);
	const tainted = serviceBearingTypes(parsed);
	return parsed
		.filter(({ path }) => !exempt(path))
		.flatMap((source) => debtsIn(source, tainted));
};
