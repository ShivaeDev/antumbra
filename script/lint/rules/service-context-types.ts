import ts from "typescript";
import { isEffectTypeReference } from "#lint/rules/effect-import.ts";
import { typeIsNever } from "#lint/rules/service-never.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";

const aliasDeclaration = (symbol: ts.Symbol): ts.TypeAliasDeclaration | undefined => symbol.declarations?.find(ts.isTypeAliasDeclaration);

const resolvedTypeArgument = (node: ts.TypeNode, checker: ts.TypeChecker, substitutions: ReadonlyMap<ts.Symbol, ts.Type>): ts.Type => {
	if (ts.isTypeReferenceNode(node)) {
		const symbol = canonicalSymbol(checker, checker.getSymbolAtLocation(node.typeName));
		const replacement = symbol === undefined ? undefined : substitutions.get(symbol);
		if (replacement !== undefined) return replacement;
	}
	return checker.getTypeFromTypeNode(node);
};

const typeArgumentIsNever = (node: ts.TypeNode, checker: ts.TypeChecker, substitutions: ReadonlyMap<ts.Symbol, ts.Type>): boolean =>
	typeIsNever(resolvedTypeArgument(node, checker, substitutions), checker);

const typeContextState = (symbol: ts.Symbol, arguments_: readonly ts.Type[], checker: ts.TypeChecker, seen: Set<ts.Symbol>): boolean | undefined => {
	if (seen.has(symbol)) return undefined;
	const declaration = aliasDeclaration(symbol);
	if (declaration === undefined || !ts.isTypeReferenceNode(declaration.type)) {
		return undefined;
	}
	seen.add(symbol);
	const substitutions = new Map<ts.Symbol, ts.Type>();
	for (const [index, parameter] of (declaration.typeParameters ?? []).entries()) {
		const parameterSymbol = checker.getSymbolAtLocation(parameter.name);
		const argument = arguments_[index] ?? (parameter.default === undefined ? undefined : checker.getTypeFromTypeNode(parameter.default));
		if (parameterSymbol !== undefined && argument !== undefined) {
			substitutions.set(parameterSymbol, argument);
		}
	}
	if (isEffectTypeReference(declaration.type, checker, "Context")) {
		return (
			declaration.type.typeArguments === undefined ||
			declaration.type.typeArguments.some((argument) => !typeArgumentIsNever(argument, checker, substitutions))
		);
	}
	const next = canonicalSymbol(checker, checker.getSymbolAtLocation(declaration.type.typeName));
	const nextArguments = (declaration.type.typeArguments ?? []).map((argument) => resolvedTypeArgument(argument, checker, substitutions));
	return next === undefined ? undefined : typeContextState(next, nextArguments, checker, seen);
};

export const typeIsNonemptyContext = (type: ts.Type, checker: ts.TypeChecker): boolean | undefined => {
	const symbol = canonicalSymbol(checker, type.aliasSymbol ?? type.symbol);
	return symbol === undefined ? undefined : typeContextState(symbol, type.aliasTypeArguments ?? [], checker, new Set());
};
