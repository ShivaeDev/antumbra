import ts from "typescript";
import { isEffectTypeReference, referenceTail } from "#lint/rules/effect-import.ts";
import { nodeContextVerdict } from "#lint/rules/service-context-verdict.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";
import { nodeIsComputation } from "#lint/rules/service-type-kinds.ts";

const SERVICE_NAMES = new Set(["DatabaseService"]);
const COMPUTATIONS = ["Effect", "Stream"] as const;

const presentTypeNode = (node: ts.TypeNode | undefined): node is ts.TypeNode => node !== undefined;

const declaredTypeNodes = (declaration: ts.Declaration): readonly ts.TypeNode[] => {
	if (ts.isVariableDeclaration(declaration)) {
		const initializer = declaration.initializer;
		const returnType = initializer !== undefined && ts.isFunctionLike(initializer) ? initializer.type : undefined;
		return [declaration.type, returnType].filter(presentTypeNode);
	}
	return ts.isFunctionLike(declaration) && declaration.type !== undefined ? [declaration.type] : [];
};

const expressionMentionsServiceSeen = (
	expression: ts.Expression,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
	seen: Set<ts.Symbol>,
): boolean => {
	let current = expression;
	while (ts.isCallExpression(current)) current = current.expression;
	const symbol = canonicalSymbol(checker, checker.getSymbolAtLocation(current));
	if (symbol === undefined || seen.has(symbol)) return false;
	seen.add(symbol);
	return (
		symbol.declarations?.some(
			(declaration) =>
				declaredTypeNodes(declaration).some((node) => typeNodeMentionsService(node, checker, services)) ||
				(ts.isVariableDeclaration(declaration) &&
					declaration.initializer !== undefined &&
					expressionMentionsServiceSeen(declaration.initializer, checker, services, seen)),
		) === true
	);
};

export const expressionMentionsService = (expression: ts.Expression, checker: ts.TypeChecker, services: ReadonlySet<ts.Symbol>): boolean =>
	expressionMentionsServiceSeen(expression, checker, services, new Set());

const queryMentionsService = (node: ts.TypeQueryNode, checker: ts.TypeChecker, services: ReadonlySet<ts.Symbol>, seen: Set<ts.Symbol>): boolean => {
	const symbol = canonicalSymbol(checker, checker.getSymbolAtLocation(node.exprName));
	if (symbol === undefined) return false;
	if (services.has(symbol)) return true;
	if (seen.has(symbol)) return false;
	seen.add(symbol);
	return (
		symbol.declarations?.some(
			(declaration) =>
				declaredTypeNodes(declaration).some((type) => typeNodeMentionsService(type, checker, services, seen)) ||
				(ts.isVariableDeclaration(declaration) &&
					declaration.initializer !== undefined &&
					expressionMentionsServiceSeen(declaration.initializer, checker, services, seen)),
		) === true
	);
};

const referenceVerdict = (node: ts.TypeReferenceNode, checker: ts.TypeChecker, services: ReadonlySet<ts.Symbol>): boolean | undefined => {
	const tail = referenceTail(node);
	if (COMPUTATIONS.some((name) => isEffectTypeReference(node, checker, name))) {
		return false;
	}
	const context = nodeContextVerdict(node, checker);
	if (context === true) return true;
	if (SERVICE_NAMES.has(tail)) return true;
	const symbol = canonicalSymbol(checker, checker.getSymbolAtLocation(node.typeName));
	return symbol !== undefined && services.has(symbol) ? true : context;
};

export const typeNodeMentionsService = (
	node: ts.TypeNode,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
	seen: Set<ts.Symbol> = new Set(),
): boolean => {
	if (nodeIsComputation(node, checker, new Set())) return false;
	if (ts.isTypeReferenceNode(node)) {
		const verdict = referenceVerdict(node, checker, services);
		if (verdict !== undefined) return verdict;
	}
	if (ts.isTypeQueryNode(node) && queryMentionsService(node, checker, services, seen)) {
		return true;
	}
	let found = false;
	ts.forEachChild(node, (child) => {
		if (ts.isTypeNode(child) && typeNodeMentionsService(child, checker, services, seen)) {
			found = true;
		}
	});
	return found;
};
