import ts from "typescript";
import { typeIsNever } from "#lint/rules/service-never.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";

export type ContextState = boolean | undefined;
export type ContextDeclaration =
	| ts.InterfaceDeclaration
	| ts.TypeAliasDeclaration;

export const combineContextStates = (
	left: ContextState,
	right: ContextState,
): ContextState => {
	if (left === true || right === true) return true;
	return left === false || right === false ? false : undefined;
};

const nodeArgumentIsNever = (
	node: ts.TypeNode,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
): boolean => {
	if (typeIsNever(checker.getTypeFromTypeNode(node), checker)) return true;
	if (node.kind === ts.SyntaxKind.NeverKeyword) return true;
	if (ts.isIntersectionTypeNode(node)) {
		return node.types.some((part) =>
			nodeArgumentIsNever(part, checker, substitutions),
		);
	}
	if (!ts.isTypeReferenceNode(node)) return false;
	const symbol = canonicalSymbol(
		checker,
		checker.getSymbolAtLocation(node.typeName),
	);
	const replacement =
		symbol === undefined ? undefined : substitutions.get(symbol);
	return (
		replacement !== undefined &&
		nodeArgumentIsNever(replacement, checker, substitutions)
	);
};

export const contextArgumentsState = (
	arguments_: readonly ts.TypeNode[] | undefined,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
): boolean =>
	arguments_ === undefined ||
	arguments_.some(
		(argument) => !nodeArgumentIsNever(argument, checker, substitutions),
	);

export const contextDeclaration = (
	symbol: ts.Symbol,
): ContextDeclaration | undefined =>
	symbol.declarations?.find(
		(declaration): declaration is ContextDeclaration =>
			ts.isInterfaceDeclaration(declaration) ||
			ts.isTypeAliasDeclaration(declaration),
	);

export const contextSubstitutions = (
	declaration: ContextDeclaration,
	arguments_: readonly ts.TypeNode[] | undefined,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
): ReadonlyMap<ts.Symbol, ts.TypeNode> => {
	const next = new Map(substitutions);
	for (const [index, parameter] of (
		declaration.typeParameters ?? []
	).entries()) {
		const symbol = checker.getSymbolAtLocation(parameter.name);
		const argument = arguments_?.[index] ?? parameter.default;
		if (symbol !== undefined && argument !== undefined) {
			next.set(symbol, argument);
		}
	}
	return next;
};
