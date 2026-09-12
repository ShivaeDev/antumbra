import ts from "typescript";
import { effectModule } from "#lint/rules/effect-import.ts";

interface Imported {
	readonly module: string;
	readonly path: string;
}

const imported = (node: ts.Identifier, checker: ts.TypeChecker): Imported | undefined => {
	for (const declaration of checker.getSymbolAtLocation(node)?.declarations ?? []) {
		const module = effectModule(declaration);
		if (module === undefined) continue;
		if (ts.isImportSpecifier(declaration) && !declaration.isTypeOnly && !declaration.parent.parent.isTypeOnly) {
			return { module, path: declaration.propertyName?.text ?? declaration.name.text };
		}
		if (ts.isNamespaceImport(declaration) && !declaration.parent.isTypeOnly) return { module, path: "" };
	}
	return undefined;
};

const importedExpression = (node: ts.Expression, checker: ts.TypeChecker): Imported | undefined => {
	if (ts.isIdentifier(node)) return imported(node, checker);
	if (!ts.isPropertyAccessExpression(node)) return undefined;
	const owner = importedExpression(node.expression, checker);
	return owner === undefined ? undefined : { module: owner.module, path: [owner.path, node.name.text].filter(Boolean).join(".") };
};

export const importsValue = (node: ts.Expression, checker: ts.TypeChecker, module: string, path: string): boolean => {
	const value = importedExpression(node, checker);
	return value?.module === module && value.path === path;
};

export const effectValueIs = (node: ts.Expression, checker: ts.TypeChecker, namespace: string, name: string): boolean =>
	importsValue(node, checker, "effect", `${namespace}.${name}`) || importsValue(node, checker, `effect/${namespace}`, name);
