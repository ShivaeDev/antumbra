import ts from "typescript";

export interface ParsedSource {
	readonly path: string;
	readonly source: ts.SourceFile;
}

const serviceBase = (expression: ts.Expression): string => {
	let current = expression;
	while (ts.isCallExpression(current)) current = current.expression;
	return ts.isPropertyAccessExpression(current) ? current.name.text : "";
};

export const declaredServiceNames = (
	sources: readonly ParsedSource[],
): ReadonlySet<string> => {
	const names = new Set(["DatabaseService", "WriteExecutors"]);
	for (const { source } of sources) {
		for (const statement of source.statements) {
			if (!ts.isClassDeclaration(statement) || statement.name === undefined) {
				continue;
			}
			const service = statement.heritageClauses?.some((clause) =>
				clause.types.some((type) =>
					["Service", "Tag"].includes(serviceBase(type.expression)),
				),
			);
			if (service === true) names.add(statement.name.text);
		}
	}
	return names;
};

export const addImportedServiceAliases = (
	source: ts.SourceFile,
	tainted: Set<string>,
): boolean => {
	let changed = false;
	for (const statement of source.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			statement.importClause?.namedBindings === undefined ||
			!ts.isNamedImports(statement.importClause.namedBindings)
		) {
			continue;
		}
		for (const specifier of statement.importClause.namedBindings.elements) {
			const imported = specifier.propertyName?.text ?? specifier.name.text;
			if (tainted.has(imported) && !tainted.has(specifier.name.text)) {
				tainted.add(specifier.name.text);
				changed = true;
			}
		}
	}
	return changed;
};
