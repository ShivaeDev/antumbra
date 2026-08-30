import ts from "typescript";
import { effectModule } from "#lint/rules/effect-import.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";

type EffectValue = "Context" | "Service" | "Tag" | "module";

const immutableDeclaration = (node: ts.VariableDeclaration): boolean => (node.parent.flags & ts.NodeFlags.Const) !== 0;

const importedEffectValue = (identifier: ts.Identifier, checker: ts.TypeChecker): EffectValue | undefined => {
	const declaration = checker.getSymbolAtLocation(identifier)?.declarations?.[0];
	if (declaration === undefined) return undefined;
	const module = effectModule(declaration);
	if (ts.isImportSpecifier(declaration)) {
		const imported = declaration.propertyName?.text ?? declaration.name.text;
		if (imported === "Context" && (module === "effect" || module === "effect/Context")) {
			return "Context";
		}
		return module === "effect/Context" && (imported === "Service" || imported === "Tag") ? imported : undefined;
	}
	if (!ts.isNamespaceImport(declaration)) return undefined;
	if (module === "effect") return "module";
	return module === "effect/Context" ? "Context" : undefined;
};

const bindingValue = (node: ts.BindingElement, checker: ts.TypeChecker, seen: Set<ts.Symbol>): EffectValue | undefined => {
	const declaration = node.parent.parent;
	if (!ts.isVariableDeclaration(declaration) || !immutableDeclaration(declaration) || declaration.initializer === undefined) {
		return undefined;
	}
	const owner = effectValue(declaration.initializer, checker, seen);
	const selected = node.propertyName?.getText() ?? node.name.getText();
	if (owner === "module" && selected === "Context") return "Context";
	if (owner === "Context" && (selected === "Service" || selected === "Tag")) {
		return selected;
	}
	return undefined;
};

const symbolEffectValue = (symbol: ts.Symbol | undefined, checker: ts.TypeChecker, seen: Set<ts.Symbol>): EffectValue | undefined => {
	const canonical = canonicalSymbol(checker, symbol);
	if (canonical === undefined || seen.has(canonical)) return undefined;
	seen.add(canonical);
	const declaration = canonical.declarations?.[0];
	if (declaration === undefined) return undefined;
	if (ts.isVariableDeclaration(declaration) && immutableDeclaration(declaration) && declaration.initializer !== undefined) {
		return effectValue(declaration.initializer, checker, seen);
	}
	return ts.isBindingElement(declaration) ? bindingValue(declaration, checker, seen) : undefined;
};

const propertyEffectValue = (expression: ts.PropertyAccessExpression, checker: ts.TypeChecker, seen: Set<ts.Symbol>): EffectValue | undefined => {
	const selected = symbolEffectValue(checker.getSymbolAtLocation(expression.name), checker, seen);
	if (selected !== undefined) return selected;
	const owner = effectValue(expression.expression, checker, seen);
	if (owner === "module" && expression.name.text === "Context") {
		return "Context";
	}
	if (owner === "Context" && expression.name.text === "Context") {
		return "Context";
	}
	if (owner === "Context" && (expression.name.text === "Service" || expression.name.text === "Tag")) {
		return expression.name.text;
	}
	return undefined;
};

const identifierEffectValue = (identifier: ts.Identifier, checker: ts.TypeChecker, seen: Set<ts.Symbol>): EffectValue | undefined => {
	const imported = importedEffectValue(identifier, checker);
	if (imported !== undefined) return imported;
	return symbolEffectValue(checker.getSymbolAtLocation(identifier), checker, seen);
};

export function effectValue(expression: ts.Expression, checker: ts.TypeChecker, seen: Set<ts.Symbol> = new Set()): EffectValue | undefined {
	let current = expression;
	while (ts.isCallExpression(current)) current = current.expression;
	if (ts.isPropertyAccessExpression(current)) {
		return propertyEffectValue(current, checker, seen);
	}
	return ts.isIdentifier(current) ? identifierEffectValue(current, checker, seen) : undefined;
}
