import ts from "typescript";
import { isEffectTypeReference } from "#lint/rules/effect-import.ts";
import { effectValue } from "#lint/rules/effect-value.ts";
import {
	type ContextDeclaration,
	type ContextState,
	combineContextStates,
	contextArgumentsState,
	contextDeclaration,
	contextSubstitutions,
} from "#lint/rules/service-context-state.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";

function childContextState(
	child: ts.Node,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
	active: Set<ts.Symbol>,
): ContextState {
	if (ts.isExpressionWithTypeArguments(child)) {
		return heritageContextState(child, checker, substitutions, active);
	}
	return ts.isTypeNode(child)
		? nodeContextState(child, checker, substitutions, active)
		: childrenContextState(child, checker, substitutions, active);
}

function childrenContextState(
	node: ts.Node,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
	active: Set<ts.Symbol>,
): ContextState {
	let state: ContextState;
	ts.forEachChild(node, (child) => {
		const childState = childContextState(child, checker, substitutions, active);
		state = combineContextStates(state, childState);
	});
	return state;
}

const declarationContextState = (
	declaration: ContextDeclaration,
	arguments_: readonly ts.TypeNode[] | undefined,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
	active: Set<ts.Symbol>,
): ContextState => {
	const next = contextSubstitutions(
		declaration,
		arguments_,
		checker,
		substitutions,
	);
	if (ts.isTypeAliasDeclaration(declaration)) {
		return nodeContextState(declaration.type, checker, next, active);
	}
	let state: ContextState;
	for (const heritage of declaration.heritageClauses ?? []) {
		for (const type of heritage.types) {
			state = combineContextStates(
				state,
				heritageContextState(type, checker, next, active),
			);
		}
	}
	for (const member of declaration.members) {
		state = combineContextStates(
			state,
			childrenContextState(member, checker, next, active),
		);
	}
	return state;
};

function heritageContextState(
	node: ts.ExpressionWithTypeArguments,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
	active: Set<ts.Symbol>,
): ContextState {
	if (effectValue(node.expression, checker) === "Context") {
		return contextArgumentsState(node.typeArguments, checker, substitutions);
	}
	const symbol = canonicalSymbol(
		checker,
		checker.getSymbolAtLocation(node.expression),
	);
	const declaration =
		symbol === undefined ? undefined : contextDeclaration(symbol);
	if (symbol === undefined || declaration === undefined || active.has(symbol)) {
		return childrenContextState(node, checker, substitutions, active);
	}
	active.add(symbol);
	const state = declarationContextState(
		declaration,
		node.typeArguments,
		checker,
		substitutions,
		active,
	);
	active.delete(symbol);
	return state;
}

export function nodeContextState(
	node: ts.TypeNode,
	checker: ts.TypeChecker,
	substitutions: ReadonlyMap<ts.Symbol, ts.TypeNode>,
	active: Set<ts.Symbol>,
): ContextState {
	if (ts.isTypeReferenceNode(node)) {
		if (isEffectTypeReference(node, checker, "Context")) {
			return contextArgumentsState(node.typeArguments, checker, substitutions);
		}
		const symbol = canonicalSymbol(
			checker,
			checker.getSymbolAtLocation(node.typeName),
		);
		const declaration =
			symbol === undefined ? undefined : contextDeclaration(symbol);
		if (
			symbol !== undefined &&
			declaration !== undefined &&
			!active.has(symbol)
		) {
			active.add(symbol);
			const state = declarationContextState(
				declaration,
				node.typeArguments,
				checker,
				substitutions,
				active,
			);
			active.delete(symbol);
			if (state !== undefined) return state;
		}
	}
	return childrenContextState(node, checker, substitutions, active);
}
