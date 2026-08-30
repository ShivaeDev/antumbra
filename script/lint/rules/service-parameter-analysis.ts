import ts from "typescript";
import type { SourceFile } from "#lint/inventory.ts";
import { type CheckedSource, serviceParameterProgram } from "#lint/rules/service-parameter-program.ts";
import { isForeignCompositionSeam } from "#lint/rules/service-parameter-seams.ts";
import { typeIsServiceBearing, typeNodeIsServiceBearing } from "#lint/rules/service-parameter-types.ts";
import { expressionMentionsService } from "#lint/rules/service-type-node.ts";
import { serviceSymbols } from "#lint/rules/service-type-symbols.ts";

export interface ServiceParameterDebt {
	readonly callable: string;
	readonly file: string;
	readonly line: number;
	readonly parameter: string;
	readonly type: string;
}

const exempt = (path: string): boolean =>
	path === "apps/desktop/src/main.ts" || /(^|\/)(test|tests|__tests__)(\/|$)/.test(path) || /\.(test|spec)\.tsx?$/.test(path);

const callableName = (node: ts.FunctionLikeDeclaration, source: ts.SourceFile): string => {
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

const lineOf = (source: ts.SourceFile, node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

const parameterIsServiceBearing = (parameter: ts.ParameterDeclaration, checker: ts.TypeChecker, services: ReadonlySet<ts.Symbol>): boolean => {
	if (parameter.type !== undefined) {
		return typeNodeIsServiceBearing(parameter.type, checker, services);
	}
	const type = checker.getTypeAtLocation(parameter);
	return (
		typeIsServiceBearing(type, checker, services) ||
		(parameter.initializer !== undefined && expressionMentionsService(parameter.initializer, checker, services))
	);
};

const debtsIn = (parsed: CheckedSource, checker: ts.TypeChecker, services: ReadonlySet<ts.Symbol>): readonly ServiceParameterDebt[] => {
	const debts: ServiceParameterDebt[] = [];
	const { path, source } = parsed;
	const visit = (node: ts.Node) => {
		if (hasImplementation(node)) {
			for (const parameter of node.parameters) {
				const type = checker.getTypeAtLocation(parameter);
				const callable = callableName(node, source);
				const parameterName = parameter.name.getText(source);
				const parameterType = parameter.type?.getText(source) ?? checker.typeToString(type);
				if (parameterIsServiceBearing(parameter, checker, services) && !isForeignCompositionSeam(path, node, parameterName, parameterType, source)) {
					debts.push({
						callable,
						file: path,
						line: lineOf(source, parameter),
						parameter: parameterName,
						type: parameterType,
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return debts;
};

export const findServiceParameters = (files: readonly SourceFile[], root: string): readonly ServiceParameterDebt[] => {
	const program = serviceParameterProgram(files, root);
	const services = serviceSymbols(program.checker, program.sources);
	return program.sources.filter(({ path }) => !exempt(path)).flatMap((source) => debtsIn(source, program.checker, services));
};
