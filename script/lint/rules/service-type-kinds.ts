import ts from "typescript";
import { isEffectTypeReference } from "#lint/rules/effect-import.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";

const COMPUTATIONS = ["Effect", "Stream"] as const;

const declarationType = (symbol: ts.Symbol): ts.TypeNode | undefined => symbol.declarations?.find(ts.isTypeAliasDeclaration)?.type;

export const nodeIsComputation = (node: ts.TypeNode, checker: ts.TypeChecker, seen: Set<ts.Symbol>): boolean => {
	if (!ts.isTypeReferenceNode(node)) return false;
	if (COMPUTATIONS.some((name) => isEffectTypeReference(node, checker, name))) {
		return true;
	}
	const symbol = canonicalSymbol(checker, checker.getSymbolAtLocation(node.typeName));
	if (symbol === undefined || seen.has(symbol)) return false;
	seen.add(symbol);
	const declaration = declarationType(symbol);
	return declaration !== undefined && nodeIsComputation(declaration, checker, seen);
};

export const typeIsComputation = (type: ts.Type, checker: ts.TypeChecker): boolean => {
	const symbol = canonicalSymbol(checker, type.aliasSymbol ?? type.symbol);
	if (symbol === undefined) return false;
	const declaration = declarationType(symbol);
	return declaration !== undefined && nodeIsComputation(declaration, checker, new Set([symbol]));
};
