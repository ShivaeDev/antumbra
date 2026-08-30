import ts from "typescript";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";

export const typeIsNever = (type: ts.Type, checker: ts.TypeChecker, seen: Set<ts.Type> = new Set()): boolean => {
	if ((type.flags & ts.TypeFlags.Never) !== 0) return true;
	if (seen.has(type)) return false;
	seen.add(type);
	if (type.isIntersection()) {
		return type.types.some((part) => typeIsNever(part, checker, seen));
	}
	const symbol = canonicalSymbol(checker, type.aliasSymbol ?? type.symbol);
	const declaration = symbol?.declarations?.find(ts.isTypeAliasDeclaration);
	return declaration !== undefined && typeIsNever(checker.getTypeFromTypeNode(declaration.type), checker, seen);
};
