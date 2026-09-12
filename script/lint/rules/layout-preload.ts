import ts from "typescript";
import type { Inventory, SourceFile } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

const RULE = "layout/preload-carries-only-electron";
const ALLOWANCE = "Electron runs a sandboxed preload inside its own script, so it carries only electron, the channel names and types";
const CARRIED = ["electron", "@antumbra/platform-shell/channels.ts", "#adapters/preload.ts"];
const PRELOAD = /^apps\/[^/]+\/src\/(?:adapters\/)?preload\.ts$/;

interface RuntimeImport {
	readonly line: number;
	readonly text: string;
}

const isTypeOnly = (node: ts.ImportDeclaration): boolean => {
	const clause = node.importClause;
	if (clause === undefined || clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return true;
	const bindings = clause.namedBindings;
	return (
		clause.name === undefined && bindings !== undefined && ts.isNamedImports(bindings) && bindings.elements.every((element) => element.isTypeOnly)
	);
};

const runtimeImportsOf = (file: SourceFile): readonly RuntimeImport[] => {
	const source = ts.createSourceFile(file.path, file.lines.join("\n"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const found: RuntimeImport[] = [];
	for (const statement of source.statements) {
		if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier) && !isTypeOnly(statement)) {
			found.push({ line: source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1, text: statement.moduleSpecifier.text });
		}
	}
	return found;
};

export const layoutPreloadViolations = (inventory: Inventory): readonly Violation[] =>
	inventory.sources
		.filter((file) => PRELOAD.test(file.path))
		.flatMap((file) =>
			runtimeImportsOf(file)
				.filter((specifier) => !CARRIED.includes(specifier.text))
				.map((specifier) => ({
					file: file.path,
					line: specifier.line,
					message: `${file.path} may not import ${specifier.text} at runtime: ${ALLOWANCE}.`,
					rule: RULE,
				})),
		);
