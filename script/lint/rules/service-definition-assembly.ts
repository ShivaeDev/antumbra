import ts from "typescript";
import type { Inventory, SourceFile } from "#lint/inventory.ts";
import { serviceAssemblyImports } from "#lint/rules/service-definition-assembly-imports.ts";
import { serviceDefinitionProblems } from "#lint/rules/service-definition-assembly-shape.ts";
import { directServiceDefinitions, implementationBodies } from "#lint/rules/service-definition-assembly-syntax.ts";
import type { Violation } from "#lint/violation.ts";

const PRODUCTION_SOURCE = /^(apps|packages)\/[^/]+\/src\/.*\.tsx?$/;
const RULE = "effect/service-definition-assembly";

const lineOf = (source: ts.SourceFile, node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

const violation = (file: string, source: ts.SourceFile, node: ts.Node, message: string): Violation => ({
	file,
	line: lineOf(source, node),
	message,
	rule: RULE,
});

const fileViolations = (file: SourceFile): readonly Violation[] => {
	if (!PRODUCTION_SOURCE.test(file.path)) return [];
	const source = ts.createSourceFile(
		file.path,
		file.lines.join("\n"),
		ts.ScriptTarget.Latest,
		true,
		file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const imports = serviceAssemblyImports(source);
	if (imports.definitions.size === 0 && imports.unsupported.length === 0) return [];
	const definitions = directServiceDefinitions(source, imports.definitions);
	const found = imports.unsupported.map((node) => violation(file.path, source, node, "Import and call defineService directly."));
	if (imports.definitions.size > 0 && definitions.length === 0) {
		found.push(violation(file.path, source, source, "Call the imported defineService directly in a top-level service declaration."));
	}
	const allowedBodies = new Set<ts.Node>();
	for (const definition of definitions) {
		for (const problem of serviceDefinitionProblems(definition, imports.effects, imports.values, allowedBodies)) {
			found.push(violation(file.path, source, problem.node, problem.message));
		}
	}
	for (const body of implementationBodies(source, allowedBodies)) {
		found.push(violation(file.path, source, body, "Move this implementation body to a named export in its own focused file."));
	}
	return found;
};

export const serviceDefinitionAssemblyViolations = (inventory: Inventory): readonly Violation[] => inventory.sources.flatMap(fileViolations);
