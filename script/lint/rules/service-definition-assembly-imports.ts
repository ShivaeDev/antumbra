import ts from "typescript";

export interface ServiceAssemblyImports {
	readonly definitions: ReadonlySet<string>;
	readonly effects: ReadonlySet<string>;
	readonly unsupported: readonly ts.Node[];
	readonly values: ReadonlySet<string>;
}

const importedNames = (clause: ts.ImportClause, name: string): readonly string[] => {
	const bindings = clause.namedBindings;
	if (bindings === undefined || !ts.isNamedImports(bindings)) return [];
	return bindings.elements.flatMap((element) =>
		!element.isTypeOnly && (element.propertyName?.text ?? element.name.text) === name ? [element.name.text] : [],
	);
};

const valueImport = (statement: ts.Statement): { readonly clause: ts.ImportClause; readonly module: string } | undefined => {
	if (
		!ts.isImportDeclaration(statement) ||
		!ts.isStringLiteral(statement.moduleSpecifier) ||
		statement.importClause === undefined ||
		statement.importClause.isTypeOnly
	) {
		return;
	}
	return {
		clause: statement.importClause,
		module: statement.moduleSpecifier.text,
	};
};

const collectDefinitionImport = (clause: ts.ImportClause, definitions: Set<string>, unsupported: ts.Node[]): void => {
	if (clause.namedBindings !== undefined && ts.isNamespaceImport(clause.namedBindings)) {
		unsupported.push(clause.namedBindings);
	}
	for (const name of importedNames(clause, "defineService")) {
		definitions.add(name);
	}
};

const collectValueImports = (clause: ts.ImportClause, values: Set<string>): void => {
	if (clause.namedBindings === undefined || !ts.isNamedImports(clause.namedBindings)) return;
	for (const element of clause.namedBindings.elements) {
		if (!element.isTypeOnly) values.add(element.name.text);
	}
};

export const serviceAssemblyImports = (source: ts.SourceFile): ServiceAssemblyImports => {
	const definitions = new Set<string>();
	const effects = new Set<string>();
	const unsupported: ts.Node[] = [];
	const values = new Set<string>();
	for (const statement of source.statements) {
		const imported = valueImport(statement);
		if (imported === undefined) continue;
		collectValueImports(imported.clause, values);
		if (imported.module === "@antumbra/service-definition") {
			collectDefinitionImport(imported.clause, definitions, unsupported);
		}
		if (imported.module === "effect") {
			for (const name of importedNames(imported.clause, "Effect")) {
				effects.add(name);
			}
		}
	}
	return { definitions, effects, unsupported, values };
};
