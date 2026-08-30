import ts from "typescript";

const importDeclaration = (node: ts.Node): ts.ImportDeclaration | undefined => {
	let current = node.parent;
	while (current !== undefined && !ts.isSourceFile(current)) {
		if (ts.isImportDeclaration(current)) return current;
		current = current.parent;
	}
	return undefined;
};

export const effectModule = (node: ts.Node): string | undefined => {
	const module = importDeclaration(node)?.moduleSpecifier;
	return module !== undefined && ts.isStringLiteral(module) ? module.text : undefined;
};

const importedEffectExport = (identifier: ts.Identifier, checker: ts.TypeChecker, exportName: string): "named" | "namespace" | undefined => {
	for (const declaration of checker.getSymbolAtLocation(identifier)?.declarations ?? []) {
		const module = effectModule(declaration);
		if (ts.isImportSpecifier(declaration)) {
			const imported = declaration.propertyName?.text ?? declaration.name.text;
			if (imported === exportName && (module === "effect" || module === `effect/${exportName}`)) {
				return "named";
			}
		}
		if (ts.isNamespaceImport(declaration) && (module === "effect" || module === `effect/${exportName}`)) {
			return "namespace";
		}
	}
	return undefined;
};

const leftmostIdentifier = (name: ts.EntityName): ts.Identifier => {
	let current = name;
	while (ts.isQualifiedName(current)) current = current.left;
	return current;
};

export const referenceTail = (node: ts.TypeReferenceNode): string => node.typeName.getText().split(".").at(-1) ?? "";

export const isEffectTypeReference = (node: ts.TypeReferenceNode, checker: ts.TypeChecker, exportName: string): boolean => {
	const identifier = leftmostIdentifier(node.typeName);
	const imported = importedEffectExport(identifier, checker, exportName);
	return imported !== undefined && (imported === "named" && node.typeName === identifier ? true : referenceTail(node) === exportName);
};
