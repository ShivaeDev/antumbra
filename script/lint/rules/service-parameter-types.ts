import ts from "typescript";
import { typeIsNonemptyContext } from "#lint/rules/service-context-types.ts";
import { nodeIsNonemptyContext } from "#lint/rules/service-context-verdict.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";
import {
	nodeIsComputation,
	typeIsComputation,
} from "#lint/rules/service-type-kinds.ts";
import { typeNodeMentionsService } from "#lint/rules/service-type-node.ts";

const PRIMITIVES =
	ts.TypeFlags.Any |
	ts.TypeFlags.Unknown |
	ts.TypeFlags.StringLike |
	ts.TypeFlags.NumberLike |
	ts.TypeFlags.BigIntLike |
	ts.TypeFlags.BooleanLike |
	ts.TypeFlags.ESSymbolLike |
	ts.TypeFlags.Void |
	ts.TypeFlags.Undefined |
	ts.TypeFlags.Null |
	ts.TypeFlags.Never;

const symbolType = (symbol: ts.Symbol, checker: ts.TypeChecker): ts.Type => {
	const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
	return declaration === undefined
		? checker.getDeclaredTypeOfSymbol(symbol)
		: checker.getTypeOfSymbolAtLocation(symbol, declaration);
};

const writeCapability = (
	type: ts.Type,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
): boolean => {
	const declaration = checker.getPropertyOfType(type, "write")
		?.declarations?.[0];
	if (declaration === undefined) return false;
	const visit = (node: ts.Node): boolean => {
		const symbol = canonicalSymbol(checker, checker.getSymbolAtLocation(node));
		return (
			(symbol !== undefined && services.has(symbol)) ||
			node.getChildren().some(visit)
		);
	};
	return visit(declaration);
};

const signatureReturnsService = (
	type: ts.Type,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
	seen: Set<ts.Type>,
): boolean =>
	checker
		.getSignaturesOfType(type, ts.SignatureKind.Call)
		.some((signature) =>
			typeIsServiceBearing(
				checker.getReturnTypeOfSignature(signature),
				checker,
				services,
				seen,
			),
		);

export const typeIsServiceBearing = (
	type: ts.Type,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
	seen: Set<ts.Type> = new Set(),
): boolean => {
	if (typeIsComputation(type, checker) || seen.has(type)) return false;
	seen.add(type);
	const symbol = canonicalSymbol(checker, type.aliasSymbol ?? type.symbol);
	if (symbol !== undefined && services.has(symbol)) return true;
	if ((type.flags & PRIMITIVES) !== 0) return false;
	const context = typeIsNonemptyContext(type, checker);
	if (context !== undefined) {
		return context;
	}
	const constraint = checker.getBaseConstraintOfType(type);
	if (
		constraint !== undefined &&
		typeIsServiceBearing(constraint, checker, services, seen)
	) {
		return true;
	}
	if (type.isUnionOrIntersection()) {
		return type.types.some((part) =>
			typeIsServiceBearing(part, checker, services, seen),
		);
	}
	if (writeCapability(type, checker, services)) return true;
	const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
	if (signatures.length > 0) {
		return signatureReturnsService(type, checker, services, seen);
	}
	if (
		(type.aliasTypeArguments ?? []).some((argument) =>
			typeIsServiceBearing(argument, checker, services, seen),
		)
	) {
		return true;
	}
	return checker
		.getPropertiesOfType(type)
		.some((property) =>
			typeIsServiceBearing(
				symbolType(property, checker),
				checker,
				services,
				seen,
			),
		);
};

export const typeNodeIsServiceBearing = (
	node: ts.TypeNode,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
): boolean =>
	!nodeIsComputation(node, checker, new Set()) &&
	(nodeIsNonemptyContext(node, checker) ||
		typeNodeMentionsService(node, checker, services) ||
		typeIsServiceBearing(checker.getTypeFromTypeNode(node), checker, services));
