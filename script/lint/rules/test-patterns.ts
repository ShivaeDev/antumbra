import ts from "typescript";
import { type Inventory, isDeclaration, type SourceFile } from "#lint/inventory.ts";
import { serviceParameterProgram } from "#lint/rules/service-parameter-program.ts";
import { importsValue } from "#lint/rules/test-imports.ts";
import { queryAnswerProblem } from "#lint/rules/test-query-patterns.ts";
import type { Violation } from "#lint/violation.ts";

const RULE = "tests/shared-patterns";
const DOM = "@antumbra/app-testing/glass/dom.ts";
const ENTRIES = ["@antumbra/app-testing/entry.ts", "@antumbra/app-testing/glass/entry.tsx"];
const COMPOSITION = [
	"@antumbra/app-testing/app.ts",
	"@antumbra/server/application.ts",
	"@antumbra/server-journal/app.ts",
	"@antumbra/server-journal/journal.ts",
	"@antumbra/server-journal/testing/kit.ts",
	"@antumbra/server-journal/testing/api.ts",
	"react-dom/client",
];
const FIXTURE = "Use the fixed it.app or it.glass entry from @antumbra/app-testing; shared fixtures own application setup and mounting.";

const candidates = (file: SourceFile): boolean => !isDeclaration(file.path) && file.path.includes("/test/") && !file.path.startsWith("apps/testing/");
const architectural = (path: string): boolean =>
	/^packages\/server\/domains\/[^/]+\/test\//.test(path) || /^packages\/glass\/[^/]+\/test\/screens\.test\.tsx$/.test(path);

const hasEntry = (source: ts.SourceFile): boolean =>
	source.statements.some((node) => {
		if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || !ENTRIES.includes(node.moduleSpecifier.text)) return false;
		const clause = node.importClause;
		if (clause === undefined || clause.isTypeOnly) return false;
		const bindings = clause.namedBindings;
		return (
			bindings !== undefined &&
			(ts.isNamespaceImport(bindings) || bindings.elements.some((item) => !item.isTypeOnly && (item.propertyName?.text ?? item.name.text) === "it"))
		);
	});

const setupImports = (node: ts.Node): readonly ts.Node[] => {
	if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return [];
	const clause = node.importClause;
	if (clause?.isTypeOnly) return [];
	const bindings = clause?.namedBindings;
	if (bindings !== undefined && ts.isNamedImports(bindings) && bindings.elements.every((item) => item.isTypeOnly)) return [];
	if (COMPOSITION.includes(node.moduleSpecifier.text)) return [node];
	if (!["vitest", "@effect/vitest"].includes(node.moduleSpecifier.text) || bindings === undefined || !ts.isNamedImports(bindings)) return [];
	return bindings.elements.filter((item) => !item.isTypeOnly && ["it", "test"].includes(item.propertyName?.text ?? item.name.text));
};

const callProblem = (node: ts.CallExpression, checker: ts.TypeChecker): string | undefined => {
	const first = node.arguments[0];
	if (
		first !== undefined &&
		importsValue(node.expression, checker, DOM, "write") &&
		ts.isCallExpression(first) &&
		importsValue(first.expression, checker, DOM, "labelled")
	) {
		return "Use fill(form, label, value) instead of write(labelled(form, label), value).";
	}
	return queryAnswerProblem(node, checker);
};

export const testPatternViolations = (inventory: Inventory): readonly Violation[] => {
	const files = inventory.sources.filter(
		(file) => candidates(file) && (architectural(file.path) || file.lines.some((line) => ENTRIES.some((entry) => line.includes(entry)))),
	);
	const { checker, sources } = serviceParameterProgram(files, inventory.root, []);
	return sources.flatMap(({ path, source }) => {
		if (!architectural(path) && !hasEntry(source)) return [];
		const found: Violation[] = [];
		const report = (node: ts.Node, message: string) =>
			found.push({ file: path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, message, rule: RULE });
		const visit = (node: ts.Node) => {
			for (const imported of setupImports(node)) report(imported, FIXTURE);
			if (
				ts.isPropertyAccessExpression(node) &&
				["vitest", "@effect/vitest"].some((module) => ["it", "test"].some((name) => importsValue(node, checker, module, name)))
			)
				report(node, FIXTURE);
			if (ts.isCallExpression(node)) {
				const message = callProblem(node, checker);
				if (message !== undefined) report(node, message);
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
		for (const comment of files.find((file) => file.path === path)?.comments ?? []) {
			if (/@vitest-environment\s+(happy-dom|jsdom)\b/.test(comment.content))
				found.push({
					file: path,
					line: comment.line,
					message: "Use the shared glass test runner configuration instead of a local browser environment directive.",
					rule: RULE,
				});
		}
		return found;
	});
};
